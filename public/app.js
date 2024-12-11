
let selectedFile = null;
// let currentPath = "/home"; 
let currentPath = "/home"; 
let directoryStack = [];
let jsonData = {
  blocks: [], 
  fileName: "",
};

let autoSaveEnabled = true; 
let saveTimeout; 

const backButton = document.getElementById("back-button");
const chooseDirectoryButton = document.getElementById("choose-directory");
const createNewFileButton = document.getElementById(
  "create-new-file-button"
);
const foldersDiv = document.getElementById("folders");
const filesDiv = document.getElementById("files");
const fileContent = document.getElementById("file-content");
const blocksContainer = document.getElementById("blocks-container");
const fileNameTitle = document.getElementById("fileNameTitle");
const updatedMessageDiv = document.getElementById("updated-message");
const autosaveToggleButton = document.getElementById("autosave-toggle");
const manualSaveButton = document.getElementById("manual-save-button");
const createCodeBlockButton =
  document.getElementById("create-code-block");
const createCommentBlockButton = document.getElementById(
  "create-comment-block"
);




let recentFiles = JSON.parse(localStorage.getItem("recentFiles")) || [];

function addToRecentFiles(filePath, fileName) {
  const existingFileIndex = recentFiles.findIndex(
    (file) => file.path === filePath
  );
  if (existingFileIndex !== -1) {
    recentFiles.splice(existingFileIndex, 1);
  }

  recentFiles.unshift({
    path: filePath,
    fileName: fileName,
  });

  if (recentFiles.length > 8) {
    recentFiles.pop();
  }

  localStorage.setItem("recentFiles", JSON.stringify(recentFiles));
}

// Load recently visited files from localStorage on page load
function loadRecentFiles() {
  const recentFilesDiv = document.getElementById("recent-files");
  recentFilesDiv.innerHTML = ""; 

  recentFiles.forEach((file) => {
    const fileButton = document.createElement("button");
    fileButton.textContent = file.fileName;
    fileButton.onclick = () => loadFile(file.path);
    recentFilesDiv.appendChild(fileButton);
  });
}

loadRecentFiles();

const savedAutoSaveSetting = localStorage.getItem("autoSaveEnabled");

if (savedAutoSaveSetting !== null) {
  autoSaveEnabled = JSON.parse(savedAutoSaveSetting); 
}

updateAutoSaveButton();

async function getDirectoryContents(dirPath) {
  try {
    const response = await fetch("/api/get-directory-contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dirPath }),
    });

    const data = await response.json();
    console.log("Directory contents:", data);

    foldersDiv.innerHTML = "";
    filesDiv.innerHTML = "";
    blocksContainer.innerHTML = ""; 

    data.directories.forEach((dir) => {
      const dirButton = document.createElement("button");
      dirButton.textContent = dir.name;
      dirButton.onclick = () => navigateToDirectory(dir.path);
      foldersDiv.appendChild(dirButton);
    });

    data.jsonFiles.forEach((file) => {
      const fileButton = document.createElement("button");
      fileButton.textContent = file.name;
      fileButton.onclick = () => loadFile(file.path); 
      filesDiv.appendChild(fileButton);
    });

    createNewFileButton.style.display = "inline-block";

    backButton.style.display =
      directoryStack.length > 0 ? "inline-block" : "none";

    selectedFile = null;
  } catch (err) {
    console.error("Error fetching directory contents:", err);
  }
}

// Navigate to a new directory
async function navigateToDirectory(newDirPath) {
  if (newDirPath !== currentPath) {
    directoryStack.push(currentPath); 
    currentPath = newDirPath; 
    getDirectoryContents(newDirPath); 
  }
}

// Go back to the previous directory using the stack
async function goBack() {
  if (directoryStack.length > 0) {
    const previousDir = directoryStack.pop();
    currentPath = previousDir;
    getDirectoryContents(previousDir); 
  }
  selectedFile = null; 
  blocksContainer.innerHTML = ""; 
  
}

backButton.onclick = goBack;

getDirectoryContents(currentPath);

async function loadFile(filePath) {
  try {
    const response = await fetch(
      `/api/load-file?filePath=${encodeURIComponent(filePath)}`
    );
    const data = await response.json();
    jsonData = data; 
    fileContent.value = JSON.stringify(data, null, 2);
    selectedFile = { name: filePath.split("/").pop(), path: filePath };

    addToRecentFiles(filePath, selectedFile.name);
    const fileHeadName = document.createElement("h3");
    fileNameTitle.textContent = `${jsonData.fileName}`;
    fileNameTitle.appendChild(fileHeadName);

    renderBlocks();
  } catch (err) {
    console.error("Error loading file:", err);
  }
}

function renderBlocks() {
  blocksContainer.innerHTML = ""; 
  

  console.log(jsonData.fileName);



  jsonData.blocks.forEach((block, index) => {
    const blockDiv = document.createElement("div");
    blockDiv.classList.add("block");

    const blockTitle = document.createElement("p");
    blockTitle.textContent = `Block ${block.blockId} (Type: ${block.type})`;
    blockDiv.appendChild(blockTitle);

    const codeDiv = document.createElement("div");
    codeDiv.classList.add("editable");
    codeDiv.contentEditable = true;
    codeDiv.textContent = block.code;

    codeDiv.addEventListener("input", function () {
      jsonData.blocks[index].code = codeDiv.textContent;
      console.log("Updated JSON data:", jsonData);

      if (autoSaveEnabled) {
        clearTimeout(saveTimeout);

        saveTimeout = setTimeout(saveFile, 1000);
      }
    });

    const moveUpButton = document.createElement("button");
    moveUpButton.textContent = "Move Up";
    moveUpButton.classList.add("move-up");
    moveUpButton.disabled = index === 0; 
    moveUpButton.addEventListener("click", function () {
      moveBlockUp(index); 
    });

    const moveDownButton = document.createElement("button");
    moveDownButton.textContent = "Move Down";
    moveDownButton.classList.add("move-down");
    moveDownButton.disabled = index === jsonData.blocks.length - 1; 
    moveDownButton.addEventListener("click", function () {
      moveBlockDown(index);
    });

    const insertCommentButton = document.createElement("button");
    insertCommentButton.textContent = "Insert Comment Below";
    insertCommentButton.classList.add("insert-comment");
    insertCommentButton.addEventListener("click", function () {
      insertCommentBelow(index); 
    });

    const insertCodeButton = document.createElement("button");
    insertCodeButton.textContent = "Insert Code Below";
    insertCodeButton.classList.add("insert-code");
    insertCodeButton.addEventListener("click", function () {
      insertCodeBelow(index);
    });

    const runButton = document.createElement("button");
    runButton.textContent = "Run";
    runButton.classList.add("run");

    runButton.addEventListener("click", function () {
      runCode(block, index); 
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete");
    deleteButton.addEventListener("click", function () {
      deleteBlock(index); 
    });

    blockDiv.appendChild(moveUpButton);
    blockDiv.appendChild(moveDownButton);
    blockDiv.appendChild(insertCommentButton);
    blockDiv.appendChild(insertCodeButton);
    blockDiv.appendChild(runButton);
    blockDiv.appendChild(deleteButton);

    blockDiv.appendChild(codeDiv);

    blocksContainer.appendChild(blockDiv);
  });
}

async function runCode(block, index) {
  try {
    if (block.type === "comment") {
      return;
    }
    console.log(block);

    const loadingMessage = document.createElement("div");
    // loadingMessage.classList.add("loading");
    // loadingMessage.textContent = "Running code...";
    blocksContainer.children[index].appendChild(loadingMessage);
    blocksContainer.classList.add("running-block");

    const response = await fetch("/api/execute-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockId: block.blockId,
        code: block.code,
        type: block.type,
      }),
    });

    const result = await response.json();

    blocksContainer.children[index].removeChild(loadingMessage);

    let resultDiv =
      blocksContainer.children[index].querySelector(".result");

    if (!resultDiv) {
      resultDiv = document.createElement("div");
      resultDiv.classList.add("result");
      blocksContainer.children[index].appendChild(resultDiv);
    }

    if (result.runStatus === false) {
      resultDiv.style.color = "red"; 
      resultDiv.textContent = ` ${result.error}`;
      console.error("Error from server:", result.error);
    } else {
      resultDiv.style.color = "black"; 
      resultDiv.textContent = ` ${result.result}`;
      console.log("Server result:", result.result); 
    }

    blocksContainer.classList.remove("running-block");
  } catch (error) {
    console.error("Error running code:", error);
    alert("Error running code on the server. Please try again.");

    let resultDiv =
      blocksContainer.children[index].querySelector(".result");
    if (!resultDiv) {
      resultDiv = document.createElement("div");
      resultDiv.classList.add("result");
      blocksContainer.children[index].appendChild(resultDiv);
    }
    resultDiv.style.color = "red"; 
    resultDiv.textContent = ` ${error.message}`;
  }
  if (autoSaveEnabled) {
    saveFile();
  }
}

async function runAllBlocks() {
  const blocksContainer = document.getElementById("blocks-container"); // Adjust the selector as needed
  const blocks = jsonData.blocks; 

  const runAllButton = document.getElementById("run-all-blocks");
  runAllButton.disabled = true;

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    await runCode3(block, index); 
  }

  runAllButton.disabled = false;
}

async function runCode3(block, index) {
  try {
    if (block.type === "comment") {
      return;
    }

    console.log(block);

    const loadingMessage = document.createElement("div");
    blocksContainer.children[index].appendChild(loadingMessage);
    blocksContainer.classList.add("running-block");

    const response = await fetch("/api/execute-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blockId: block.blockId,
        code: block.code,
        type: block.type,
      }),
    });

    const result = await response.json();

    blocksContainer.children[index].removeChild(loadingMessage);

    let resultDiv =
      blocksContainer.children[index].querySelector(".result");

    if (!resultDiv) {
      resultDiv = document.createElement("div");
      resultDiv.classList.add("result");
      blocksContainer.children[index].appendChild(resultDiv);
    }

    if (result.runStatus === false) {
      resultDiv.style.color = "red";
      resultDiv.textContent = ` ${result.error}`;
      console.error("Error from server:", result.error);
    } else {
      resultDiv.style.color = "black"; 
      resultDiv.textContent = ` ${result.result}`;
      console.log("Server result:", result.result); 
    }

    blocksContainer.classList.remove("running-block");
  } catch (error) {
    console.error("Error running code:", error);
    alert("Error running code on the server. Please try again.");

    let resultDiv =
      blocksContainer.children[index].querySelector(".result");
    if (!resultDiv) {
      resultDiv = document.createElement("div");
      resultDiv.classList.add("result");
      blocksContainer.children[index].appendChild(resultDiv);
    }
    resultDiv.style.color = "red"; 
    resultDiv.textContent = ` ${error.message}`;
  }
  if (autoSaveEnabled) {
    saveFile();
  }
}

document
  .getElementById("run-all-blocks")
  .addEventListener("click", runAllBlocks);

function deleteBlock(index) {
  if (confirm("Are you sure you want to delete this block?")) {
    jsonData.blocks.splice(index, 1); 
    renderBlocks(); 
    if (autoSaveEnabled) {
      saveFile();
    }
  }
}

function moveBlockUp(index) {
  if (index > 0) {
    const temp = jsonData.blocks[index];
    jsonData.blocks[index] = jsonData.blocks[index - 1];
    jsonData.blocks[index - 1] = temp;
    renderBlocks(); 

    // Trigger auto-save if enabled
    if (autoSaveEnabled) {
      saveFile();
    }
  }
}

// Move block down in the array
function moveBlockDown(index) {
  if (index < jsonData.blocks.length - 1) {
    const temp = jsonData.blocks[index];
    jsonData.blocks[index] = jsonData.blocks[index + 1];
    jsonData.blocks[index + 1] = temp;
    renderBlocks();

    // Trigger auto-save if enabled
    if (autoSaveEnabled) {
      saveFile();
    }
  }
}

function insertCommentBelow(index) {
  const newCommentBlock = {
    blockId: jsonData.blocks.length + 1,
    type: "comment",
    code: "// This is a new comment block",
  };
  jsonData.blocks.splice(index + 1, 0, newCommentBlock); 
  renderBlocks();

  if (autoSaveEnabled) {
    saveFile();
  }
}

function insertCodeBelow(index) {
  const newCodeBlock = {
    blockId: jsonData.blocks.length + 1,
    type: "code",
    code: "console.log('New code block');",
  };
  jsonData.blocks.splice(index + 1, 0, newCodeBlock); 
  renderBlocks(); 

  if (autoSaveEnabled) {
    saveFile();
  }
}

createCodeBlockButton.onclick = () => {
  const newBlock = {
    blockId: Date.now(),
    type: "code",
    code: "", 
  };

  jsonData.blocks.push(newBlock);

  renderBlocks();

  if (autoSaveEnabled) {
    saveFile();
  }
};

createCommentBlockButton.onclick = () => {
  const newBlock = {
    blockId: Date.now(),
    type: "comment",
    code: "", 
  };

  jsonData.blocks.push(newBlock);

  renderBlocks();

  if (autoSaveEnabled) {
    saveFile();
  }
};

async function saveFile() {
  try {
    if (!selectedFile) {
      alert("No file selected to save.");
      return;
    }

    const dataToSend = {
      filePath: selectedFile.path,
      data: JSON.stringify(jsonData), 
    };

    const response = await fetch("/api/save-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });

    const result = await response.text();
    console.log("saving");
    console.log(result); 

    updatedMessageDiv.style.display = "block";


    setTimeout(() => {
      updatedMessageDiv.style.display = "none";
    }, 800);
  } catch (err) {
    alert(" Could not save the file.");
    console.error(err);
  }
}

// Toggle auto-save setting
autosaveToggleButton.onclick = () => {
  autoSaveEnabled = !autoSaveEnabled;
  updateAutoSaveButton();
  localStorage.setItem(
    "autoSaveEnabled",
    JSON.stringify(autoSaveEnabled)
  );
};

// Update the auto-save toggle button text
function updateAutoSaveButton() {
  autosaveToggleButton.textContent = autoSaveEnabled
    ? "Disable Auto-Save"
    : "Enable Auto-Save";
}

// Attach the manual save function to the manual save button
manualSaveButton.onclick = saveFile;

// Create a new JSON file when the "Create New JSON File" button is clicked
createNewFileButton.onclick = async () => {
  const fileName = prompt(
    "Enter the name of the new file (without extension):"
  );

  if (fileName) {
    // Ensure the file name doesn't have an extension
    const fileNameWithExtension = fileName.endsWith(".json")
      ? fileName
      : `${fileName}.json`;

    try {
      const response = await fetch("/api/create-new-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dirPath: currentPath, 
          fileName: fileNameWithExtension, 
        }),
      });

      const result = await response.text();
      alert(result); 
       const newFilePath = `${currentPath}/${fileNameWithExtension}`;

      let recentFiles =
        JSON.parse(localStorage.getItem("recentFiles")) || [];

      recentFiles = recentFiles.filter(
        (file) => file.path !== newFilePath
      );

      recentFiles.unshift({
        path: newFilePath,
        name: fileNameWithExtension,
      });

      if (recentFiles.length > 8) {
        recentFiles = recentFiles.slice(0, 8);
      }
      localStorage.setItem("recentFiles", JSON.stringify(recentFiles));

      loadFile(newFilePath);
      getDirectoryContents(currentPath); 
    } catch (err) {
      console.error("Error creating file:", err);
      alert("Error creating the file.");
    }
  }
};
