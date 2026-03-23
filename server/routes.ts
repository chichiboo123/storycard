import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReplitConnectors } from "@replit/connectors-sdk";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Cards for Storytelling API is running" });
  });

  // Add SPA fallback route for root path
  app.get("/", (req, res, next) => {
    // Let Vite middleware handle this
    next();
  });

  // Get random image proxy endpoint (to handle CORS issues)
  app.get("/api/images/picsum/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const imageUrl = `https://picsum.photos/200/300?random=${id}&t=${Date.now()}`;
      
      // Proxy the image request
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      
      res.send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error('Error proxying image:', error);
      res.status(500).json({ error: 'Failed to fetch image' });
    }
  });

  // Save story endpoint (for future use)
  app.post("/api/stories", async (req, res) => {
    try {
      const { title, content, cardImages } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const story = await storage.createStory({
        title,
        content,
        cardImages: cardImages || []
      });

      res.json(story);
    } catch (error) {
      console.error('Error saving story:', error);
      res.status(500).json({ error: "Failed to save story" });
    }
  });

  // Get stories endpoint (for future use)
  app.get("/api/stories", async (req, res) => {
    try {
      const stories = await storage.getAllStories();
      res.json(stories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  // GitHub: get authenticated user info
  app.get("/api/github/user", async (req, res) => {
    try {
      const connectors = new ReplitConnectors();
      const response = await connectors.proxy("github", "/user", { method: "GET" });
      const user = await response.json();
      res.json(user);
    } catch (error) {
      console.error("GitHub user error:", error);
      res.status(500).json({ error: "Failed to fetch GitHub user" });
    }
  });

  // GitHub: check if storycard repo exists
  app.get("/api/github/repo-status", async (req, res) => {
    try {
      const connectors = new ReplitConnectors();
      const userRes = await connectors.proxy("github", "/user", { method: "GET" });
      const user = await userRes.json() as { login: string };

      const repoRes = await connectors.proxy("github", `/repos/${user.login}/storycard`, { method: "GET" });
      if (repoRes.status === 200) {
        const repo = await repoRes.json() as { html_url: string; full_name: string };
        res.json({ exists: true, url: repo.html_url, fullName: repo.full_name, login: user.login });
      } else {
        res.json({ exists: false, login: user.login });
      }
    } catch (error) {
      console.error("Repo status error:", error);
      res.status(500).json({ error: "Failed to check repository" });
    }
  });

  // GitHub: create storycard repo and push files
  app.post("/api/github/push", async (req, res) => {
    try {
      const connectors = new ReplitConnectors();

      // Get authenticated user
      const userRes = await connectors.proxy("github", "/user", { method: "GET" });
      const user = await userRes.json() as { login: string };
      const owner = user.login;
      const repoName = "storycard";

      // Check if repo exists, create if not (with auto_init to avoid empty repo issues)
      const checkRes = await connectors.proxy("github", `/repos/${owner}/${repoName}`, { method: "GET" });
      let repoIsEmpty = false;
      if (checkRes.status === 404) {
        const createRes = await connectors.proxy("github", "/user/repos", {
          method: "POST",
          body: JSON.stringify({
            name: repoName,
            description: "Cards for Storytelling - 이야기 카드 앱",
            private: false,
            auto_init: true,
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (createRes.status !== 201) {
          const err = await createRes.json();
          return res.status(500).json({ error: "Failed to create repository", details: err });
        }
        repoIsEmpty = false; // auto_init creates a commit
      } else {
        // Check if the existing repo has any commits
        const refCheck = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/ref/heads/main`, { method: "GET" });
        if (refCheck.status !== 200) {
          repoIsEmpty = true;
          // Initialize the empty repo with a README via Contents API
          const initRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/contents/README.md`, {
            method: "PUT",
            body: JSON.stringify({
              message: "init: initialize repository",
              content: Buffer.from("# storycard\n\nCards for Storytelling - 이야기 카드 앱\n").toString("base64"),
            }),
            headers: { "Content-Type": "application/json" },
          });
          if (initRes.status !== 201) {
            const err = await initRes.json();
            return res.status(500).json({ error: "Failed to initialize repository", details: err });
          }
        }
      }

      // Collect files to push
      const root = process.cwd();
      const textFilesToPush: { path: string; content: Buffer }[] = [];
      const binaryFilesToPush: { path: string; content: Buffer }[] = [];

      const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md", ".yml", ".yaml", ".txt", ".gitignore"]);
      const binaryExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".ico", ".woff", ".woff2"]);
      const skipDirs = new Set(["node_modules", ".git", "dist", ".local", "attached_assets", "storytelling-cards-app.zip", ".cache", ".github"]);

      function collectFiles(dir: string, base: string) {
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          if (skipDirs.has(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(base, entry.name).replace(/\\/g, "/");
          if (entry.isDirectory()) {
            collectFiles(fullPath, relPath);
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            const isSpecial = entry.name === ".gitignore" || entry.name === "Dockerfile";
            try {
              if (textExtensions.has(ext) || isSpecial) {
                textFilesToPush.push({ path: relPath, content: fs.readFileSync(fullPath) });
              } else if (binaryExtensions.has(ext)) {
                const stat = fs.statSync(fullPath);
                // Only include binary files under 600KB (proxy body size limit)
                if (stat.size < 600 * 1024) {
                  binaryFilesToPush.push({ path: relPath, content: fs.readFileSync(fullPath) });
                }
              }
            } catch { /* skip unreadable files */ }
          }
        }
      }

      collectFiles(root, "");

      const allFiles = [...textFilesToPush, ...binaryFilesToPush];

      // Get current commit SHA from main branch (for parent and base_tree)
      let parentSha: string | undefined;
      let baseTreeSha: string | undefined;
      const branchRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/ref/heads/main`, { method: "GET" });
      if (branchRes.status === 200) {
        const branch = await branchRes.json() as { object: { sha: string } };
        parentSha = branch.object.sha;
        // Get the tree SHA from the current HEAD commit
        const commitRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/commits/${parentSha}`, { method: "GET" });
        if (commitRes.status === 200) {
          const commit = await commitRes.json() as { tree: { sha: string } };
          baseTreeSha = commit.tree.sha;
        }
      }

      // Create blobs for each file
      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
      for (const file of allFiles) {
        const base64Content = file.content.toString("base64");
        const blobRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: base64Content, encoding: "base64" }),
          headers: { "Content-Type": "application/json" },
        });
        const blobText = await blobRes.text();
        let blob: { sha?: string; message?: string };
        try { blob = JSON.parse(blobText); } catch { blob = { message: blobText.substring(0, 100) }; }
        if (blobRes.status !== 201 || !blob.sha) {
          console.error("Blob creation failed:", blobRes.status, blob, "file:", file.path);
          return res.status(500).json({ error: "Failed to create blob", file: file.path, details: blob });
        }
        treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      // Create tree - use base_tree to preserve any existing files not in our list
      const treeBody: { base_tree?: string; tree: typeof treeItems } = { tree: treeItems };
      if (baseTreeSha) treeBody.base_tree = baseTreeSha;

      const newTreeRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        body: JSON.stringify(treeBody),
        headers: { "Content-Type": "application/json" },
      });
      const newTreeText = await newTreeRes.text();
      let newTree: { sha?: string; message?: string };
      try { newTree = JSON.parse(newTreeText); } catch { newTree = { message: newTreeText.substring(0, 100) }; }
      if (newTreeRes.status !== 201 || !newTree.sha) {
        console.error("Tree creation failed:", newTreeRes.status, newTree);
        return res.status(500).json({ error: "Failed to create tree", details: newTree });
      }

      // Create commit
      const newCommitRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: "feat: push project files from Replit",
          tree: newTree.sha,
          parents: parentSha ? [parentSha] : [],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const newCommit = await newCommitRes.json() as { sha?: string; message?: string };
      if (newCommitRes.status !== 201 || !newCommit.sha) {
        console.error("Commit creation failed:", newCommitRes.status, newCommit);
        return res.status(500).json({ error: "Failed to create commit", details: newCommit });
      }

      // Update main branch reference (force push)
      const updateRefRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/refs/heads/main`, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
        headers: { "Content-Type": "application/json" },
      });
      const updateRefBody = await updateRefRes.json() as { message?: string };
      if (updateRefRes.status !== 200 && updateRefRes.status !== 201) {
        console.error("Ref update failed:", updateRefRes.status, updateRefBody);
        return res.status(500).json({ error: "Failed to update branch", details: updateRefBody });
      }

      res.json({
        success: true,
        url: `https://github.com/${owner}/${repoName}`,
        filesCount: allFiles.length,
        textFiles: textFilesToPush.length,
        binaryFiles: binaryFilesToPush.length,
        commit: newCommit.sha,
      });
    } catch (error) {
      console.error("GitHub push error:", error);
      res.status(500).json({ error: "Failed to push to GitHub", details: String(error) });
    }
  });

  // GitHub: build static site and deploy directly to gh-pages branch
  app.post("/api/github/setup-and-deploy", async (req, res) => {
    // Set a long timeout for this response
    req.setTimeout(300000);
    res.setTimeout(300000);

    try {
      const connectors = new ReplitConnectors();
      const { execSync } = await import("child_process");

      const userRes = await connectors.proxy("github", "/user", { method: "GET" });
      const user = await userRes.json() as { login: string };
      const owner = user.login;
      const repoName = "storycard";

      // Check repo exists
      const repoCheck = await connectors.proxy("github", `/repos/${owner}/${repoName}`, { method: "GET" });
      if (repoCheck.status === 404) {
        return res.status(400).json({ error: "storycard 저장소가 없습니다. 먼저 '소스 저장'을 눌러주세요." });
      }

      // Build the static site
      const root = process.cwd();
      try {
        execSync("node build-static.js", { cwd: root, timeout: 120000, stdio: "pipe" });
      } catch (buildError) {
        return res.status(500).json({ error: "빌드 실패", details: String(buildError) });
      }

      // Collect all built files from dist/
      const distDir = path.join(root, "dist");
      const distFiles: { path: string; content: Buffer }[] = [];

      function collectDist(dir: string, base: string) {
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            collectDist(fullPath, relPath);
          } else {
            distFiles.push({ path: relPath, content: fs.readFileSync(fullPath) });
          }
        }
      }
      collectDist(distDir, "");

      // Create blobs for all dist files
      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
      for (const file of distFiles) {
        const base64Content = file.content.toString("base64");
        const blobRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: base64Content, encoding: "base64" }),
          headers: { "Content-Type": "application/json" },
        });
        const blobText = await blobRes.text();
        let blob: { sha?: string; message?: string };
        try { blob = JSON.parse(blobText); } catch { blob = { message: blobText.substring(0, 100) }; }
        if (blobRes.status !== 201 || !blob.sha) {
          return res.status(500).json({ error: "블롭 생성 실패", file: file.path, details: blob });
        }
        treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      // Create tree (no base_tree - fresh gh-pages content)
      const treeRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ tree: treeItems }),
        headers: { "Content-Type": "application/json" },
      });
      const treeText = await treeRes.text();
      let newTree: { sha?: string; message?: string };
      try { newTree = JSON.parse(treeText); } catch { newTree = { message: treeText.substring(0, 100) }; }
      if (treeRes.status !== 201 || !newTree.sha) {
        return res.status(500).json({ error: "트리 생성 실패", details: newTree });
      }

      // Create orphan commit
      const commitRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: "deploy: 배포 빌드 업데이트",
          tree: newTree.sha,
          parents: [],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const newCommit = await commitRes.json() as { sha?: string; message?: string };
      if (commitRes.status !== 201 || !newCommit.sha) {
        return res.status(500).json({ error: "커밋 생성 실패", details: newCommit });
      }

      // Create or update gh-pages branch
      const ghPagesRef = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/ref/heads/gh-pages`, { method: "GET" });
      let branchRes;
      if (ghPagesRef.status === 200) {
        branchRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/refs/heads/gh-pages`, {
          method: "PATCH",
          body: JSON.stringify({ sha: newCommit.sha, force: true }),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        branchRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/refs`, {
          method: "POST",
          body: JSON.stringify({ ref: "refs/heads/gh-pages", sha: newCommit.sha }),
          headers: { "Content-Type": "application/json" },
        });
      }
      if (branchRes.status !== 200 && branchRes.status !== 201) {
        const branchData = await branchRes.json();
        return res.status(500).json({ error: "브랜치 설정 실패", details: branchData });
      }

      // Enable/update GitHub Pages to use gh-pages branch
      // Try POST first (create), if 409 (already exists), use PUT (update)
      const pagesPost = await connectors.proxy("github", `/repos/${owner}/${repoName}/pages`, {
        method: "POST",
        body: JSON.stringify({ source: { branch: "gh-pages", path: "/" } }),
        headers: { "Content-Type": "application/json" },
      });
      if (pagesPost.status === 409) {
        // Already exists, update it
        await connectors.proxy("github", `/repos/${owner}/${repoName}/pages`, {
          method: "PUT",
          body: JSON.stringify({ source: { branch: "gh-pages", path: "/" } }),
          headers: { "Content-Type": "application/json" },
        });
      }

      const pagesUrl = `https://${owner}.github.io/${repoName}/`;

      res.json({
        success: true,
        pagesUrl,
        filesCount: distFiles.length,
        commit: newCommit.sha,
        message: "빌드 파일이 GitHub Pages에 직접 배포되었습니다. 1~2분 후 사이트가 활성화됩니다.",
      });
    } catch (error) {
      console.error("Setup and deploy error:", error);
      res.status(500).json({ error: "배포 실패", details: String(error) });
    }
  });

  // GitHub: trigger GitHub Actions workflow to build and deploy to gh-pages
  app.post("/api/github/deploy-pages", async (req, res) => {
    try {
      const connectors = new ReplitConnectors();

      const userRes = await connectors.proxy("github", "/user", { method: "GET" });
      const user = await userRes.json() as { login: string };
      const owner = user.login;
      const repoName = "storycard";

      // Check repo exists
      const checkRes = await connectors.proxy("github", `/repos/${owner}/${repoName}`, { method: "GET" });
      if (checkRes.status === 404) {
        return res.status(400).json({ error: "storycard 저장소가 없습니다. 먼저 소스 저장을 눌러주세요." });
      }

      // Check workflow file exists on main branch
      const wfCheck = await connectors.proxy("github", `/repos/${owner}/${repoName}/contents/.github/workflows/deploy.yml`, { method: "GET" });
      if (wfCheck.status === 404) {
        return res.status(400).json({ error: "워크플로우 파일이 없습니다. 먼저 소스 저장을 눌러주세요." });
      }

      // Trigger workflow_dispatch on the deploy.yml workflow
      const triggerRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/actions/workflows/deploy.yml/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref: "main" }),
        headers: { "Content-Type": "application/json" },
      });

      if (triggerRes.status !== 204) {
        const triggerBody = await triggerRes.json();
        console.error("Workflow trigger failed:", triggerRes.status, triggerBody);
        return res.status(500).json({ error: "워크플로우 실행 실패", details: triggerBody });
      }

      // Enable GitHub Pages source (best effort)
      await connectors.proxy("github", `/repos/${owner}/${repoName}/pages`, {
        method: "POST",
        body: JSON.stringify({ source: { branch: "gh-pages", path: "/" } }),
        headers: { "Content-Type": "application/json" },
      });

      const pagesUrl = `https://${owner}.github.io/${repoName}`;
      const actionsUrl = `https://github.com/${owner}/${repoName}/actions`;

      res.json({
        success: true,
        pagesUrl,
        actionsUrl,
        message: "GitHub Actions 워크플로우가 시작되었습니다. 2~3분 후 Pages가 활성화됩니다.",
      });
    } catch (error) {
      console.error("Deploy pages error:", error);
      res.status(500).json({ error: "배포 실패", details: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
