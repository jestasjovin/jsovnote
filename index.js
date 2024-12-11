const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const app = express();
const vm = require("vm");

app.use(cors());

// app.use(cors({
//   origin: 'http://localhost:3344',
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
// app.use(limiter);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
//TO DO enabling cors

app.post("/api/execute-code", (req, res) => {
  console.log(req.body);
  const { type, code } = req.body;
  console.log("Executing:", type);

  if (type === "comment") {
    console.log("Executing:", type);
    const result = "done";
    res.json({ runStatus: true, result });
    return;
  }

  try {
    const sandbox = {
      result: [],
      console: {
        log: (msg) => {
          sandbox.result.push(msg);
        },
      },
    };

    const context = vm.createContext(sandbox);

    vm.runInContext(code, context);

    console.error(sandbox);
    console.error(sandbox.result);

    const result =
      sandbox.result.join("\n") ||
      "Code executed successfully, but no result was returned.";
    console.error("TO DO save file");

    res.json({ runStatus: true, result });
  } catch (err) {
    console.error("Error executing code:", err);

    if (!res.headersSent) {
      res.status(500).json({ runStatus: false, error: String(err) });
    }
  }
});

app.post("/api/execute-all-codes", (req, res) => {
  console.log(req.body);
  const { fileName, blocks } = req.body;

  let results = [];
  let currentIndex = 0;
  console.log(`Executing : ${fileName}`);

  function executeNextBlock() {
    if (currentIndex >= blocks.length) {
      return res.json({ runStatus: true, fileName, results });
    }

    const { blockId, type, code } = blocks[currentIndex];
    console.log(
      `Executing block ${currentIndex + 1} of ${
        blocks.length
      }, blockId: ${blockId}, type: ${type}`
    );

    if (type === "comment") {
      results.push({
        blockId,
        result: "This is a comment, skipping execution",
      });
      currentIndex++;
      return executeNextBlock();
    }

    console.error(`Executing code block with blockId: ${blockId}`);

    try {
      const sandbox = {
        result: [],
        console: {
          log: (msg) => {
            sandbox.result.push(msg);
          },
        },
      };

      const context = vm.createContext(sandbox);

      vm.runInContext(code, context);

      const result =
        sandbox.result.join("\n") ||
        "Code executed successfully, but no result was returned.";

      results.push({ blockId, result });
      currentIndex++;

      executeNextBlock();
    } catch (err) {
      console.error("Error executing code:", err);

      results.push({ blockId, result: `Error: ${err.message}` });
      currentIndex++;

      executeNextBlock();
    }
  }
  executeNextBlock();
});

app.post("/api/get-directory-contents", (req, res) => {
  const { dirPath } = req.body;
  console.log("Fetching contents of directory:", dirPath);

  fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      return res.status(500).send("Error reading directory");
    }

    const directories = [];
    const jsonFiles = [];

    files.forEach((file) => {
      const filePath = path.join(dirPath, file.name);
      if (
        file.name === "boot" ||
        file.name === "cdrom" ||
        file.name === "etc" ||
        file.name === "lost+found" ||
        file.name === "proc" ||
        file.name === "lost+found" ||
        file.name === "root" ||
        file.name === "run" ||
        file.name === "opt" ||
        file.name === "snap" ||
        file.name === "srv" ||
        file.name === "sys" ||
        file.name === "tmp" ||
        file.name === "var" ||
        file.name === "usr" ||
        file.name === "mnt" ||
        file.name === "linuxbrew"
      ) {
        return;
      }
      if (file.name.includes(".") && !file.name.endsWith(".json")) {
        return;
      }
      if (file.isDirectory()) {
        directories.push({
          name: file.name,
          path: filePath,
        });
      } else if (file.isFile() && file.name.endsWith(".json")) {
        jsonFiles.push({
          name: file.name,
          path: filePath,
        });
      }
    });

    res.json({ directories, jsonFiles });
  });
});

app.get("/api/load-file", (req, res) => {
  const { filePath } = req.query;
  console.log("Loading file:", filePath);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }

    try {
      const jsonContent = JSON.parse(data);
      res.json(jsonContent);
    } catch (parseErr) {
      console.error("Error parsing JSON:", parseErr);
      res.status(500).send("Error parsing JSON");
    }
  });
});

app.post("/api/save-file", (req, res) => {
  const { filePath, data } = req.body;
  console.log("Saving Data:", data);
  console.log("Saving file:", filePath);

  fs.writeFile(filePath, data, "utf8", (err) => {
    if (err) {
      return res.status(500).send("Error saving file");
    }

    console.log("File saved successfully!");
    res.send("File saved successfully");
  });
});

app.post("/api/create-new-file", (req, res) => {
  const { dirPath, fileName } = req.body;

  const newFilePath = path.join(dirPath, fileName);
  const initialData = {
    fileName: fileName,
    blocks: [],
  };

  fs.writeFile(
    newFilePath,
    JSON.stringify(initialData, null, 2),
    "utf8",
    (err) => {
      if (err) {
        return res.status(500).send("Error creating new file");
      }

      console.log("New file created successfully:", newFilePath);
      res.send("New file created successfully");
    }
  );
});

app.listen(3344, () => {
  console.log("Server running on http://localhost:3344");
});
