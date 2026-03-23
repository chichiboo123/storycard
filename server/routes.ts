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
      const filesToPush: { path: string; content: string }[] = [];

      const allowedExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md"];
      const skipDirs = new Set(["node_modules", ".git", "dist", ".local", "attached_assets", "storytelling-cards-app.zip", ".cache"]);

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
            const ext = path.extname(entry.name);
            if (allowedExtensions.includes(ext) || entry.name === ".gitignore" || entry.name === "Dockerfile") {
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                filesToPush.push({ path: relPath, content });
              } catch { /* skip unreadable files */ }
            }
          }
        }
      }

      collectFiles(root, "");

      // Get current commit SHA from main branch
      let parentSha: string | undefined;
      let treeSha: string | undefined;
      const branchRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/ref/heads/main`, { method: "GET" });
      if (branchRes.status === 200) {
        const branch = await branchRes.json() as { object: { sha: string } };
        parentSha = branch.object.sha;
        const commitRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/commits/${parentSha}`, { method: "GET" });
        const commit = await commitRes.json() as { tree: { sha: string } };
        treeSha = commit.tree.sha;
      }

      // Create blobs for each file
      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
      for (const file of filesToPush) {
        const blobRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: Buffer.from(file.content).toString("base64"), encoding: "base64" }),
          headers: { "Content-Type": "application/json" },
        });
        const blob = await blobRes.json() as { sha?: string; message?: string };
        if (blobRes.status !== 201 || !blob.sha) {
          console.error("Blob creation failed:", blobRes.status, blob, "file:", file.path);
          return res.status(500).json({ error: "Failed to create blob", file: file.path, details: blob });
        }
        treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      // Create tree (on top of existing tree if any)
      const treeBody: Record<string, unknown> = { tree: treeItems };
      if (treeSha) treeBody.base_tree = treeSha;
      const newTreeRes = await connectors.proxy("github", `/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        body: JSON.stringify(treeBody),
        headers: { "Content-Type": "application/json" },
      });
      const newTree = await newTreeRes.json() as { sha?: string; message?: string };
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
        filesCount: filesToPush.length,
        commit: newCommit.sha,
      });
    } catch (error) {
      console.error("GitHub push error:", error);
      res.status(500).json({ error: "Failed to push to GitHub", details: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
