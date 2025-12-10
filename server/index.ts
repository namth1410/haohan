import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import * as Minio from "minio";
import { Readable } from "stream";

const app = express();
const PORT = 3001;

// MinIO Configuration
const minioEndpoint = process.env.MINIO_ENDPOINT || "minio-api.namth.online";
const minioUseSSL =
  process.env.MINIO_USE_SSL === "true" ||
  minioEndpoint.includes(".namth.online");
const minioPort = process.env.MINIO_PORT
  ? parseInt(process.env.MINIO_PORT)
  : minioUseSSL
  ? 443
  : 9000;

const minioClient = new Minio.Client({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "namth",
  secretKey: process.env.MINIO_SECRET_KEY || "01664157092aA",
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "haohan";

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Types
interface FileItem {
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
  path: string;
}

// Helper function to list objects with prefix
async function listObjects(prefix: string = ""): Promise<FileItem[]> {
  return new Promise((resolve, reject) => {
    const items: FileItem[] = [];
    const seenFolders = new Set<string>();

    const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, false);

    stream.on("data", (obj) => {
      if (obj.prefix) {
        // This is a folder
        const folderName = obj.prefix.replace(prefix, "").replace(/\/$/, "");
        if (folderName && !seenFolders.has(folderName)) {
          seenFolders.add(folderName);
          items.push({
            name: folderName,
            type: "folder",
            path: obj.prefix,
          });
        }
      } else if (obj.name) {
        // This is a file
        const fileName = obj.name.replace(prefix, "");
        if (fileName) {
          items.push({
            name: fileName,
            type: "file",
            size: obj.size,
            lastModified: obj.lastModified,
            path: obj.name,
          });
        }
      }
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("end", () => {
      // Sort: folders first, then files
      items.sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
      resolve(items);
    });
  });
}

// API Routes

// Check if bucket exists
app.get("/api/bucket/check", async (_req: Request, res: Response) => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
    }
    res.json({ success: true, bucket: BUCKET_NAME });
  } catch (error) {
    console.error("Error checking bucket:", error);
    res.status(500).json({ error: "Failed to check bucket" });
  }
});

// List files and folders
app.get("/api/files", async (req: Request, res: Response) => {
  try {
    const prefix = (req.query.prefix as string) || "";
    const items = await listObjects(prefix);
    res.json({ items, prefix });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// Get file content (for preview)
app.get("/api/files/preview", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    const stat = await minioClient.statObject(BUCKET_NAME, filePath);
    const stream = await minioClient.getObject(BUCKET_NAME, filePath);

    res.setHeader(
      "Content-Type",
      stat.metaData?.["content-type"] || "application/octet-stream"
    );
    res.setHeader("Content-Length", stat.size);

    stream.pipe(res);
  } catch (error) {
    console.error("Error previewing file:", error);
    res.status(500).json({ error: "Failed to preview file" });
  }
});

// Download file
app.get("/api/files/download", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    const fileName = filePath.split("/").pop() || "download";
    const stat = await minioClient.statObject(BUCKET_NAME, filePath);
    const stream = await minioClient.getObject(BUCKET_NAME, filePath);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", stat.size);

    stream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Upload file
app.post(
  "/api/files/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const prefix = req.body.prefix || "";
      const fileName = req.file.originalname;
      const filePath = prefix ? `${prefix}${fileName}` : fileName;

      const readable = new Readable();
      readable.push(req.file.buffer);
      readable.push(null);

      await minioClient.putObject(
        BUCKET_NAME,
        filePath,
        readable,
        req.file.size,
        { "Content-Type": req.file.mimetype }
      );

      res.json({ success: true, path: filePath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// Create folder
app.post("/api/folders", async (req: Request, res: Response) => {
  try {
    const { folderName, prefix = "" } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    const folderPath = prefix ? `${prefix}${folderName}/` : `${folderName}/`;

    // Create an empty object to represent the folder
    const readable = new Readable();
    readable.push("");
    readable.push(null);

    await minioClient.putObject(BUCKET_NAME, `${folderPath}.keep`, readable, 0);

    res.json({ success: true, path: folderPath });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Get presigned URL for direct download
app.get("/api/files/url", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    // Generate presigned URL valid for 1 hour
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      filePath,
      60 * 60
    );
    res.json({ url });
  } catch (error) {
    console.error("Error generating URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `MinIO Endpoint: ${
      minioUseSSL ? "https" : "http"
    }://${minioEndpoint}:${minioPort}`
  );
  console.log(`Bucket: ${BUCKET_NAME}`);
});
