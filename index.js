import { WebContainer } from '@webcontainer/api';
import { files } from "./files";
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { askClaudeRemote, askICDSRemote } from './src/api.js';
import { FitAddon } from '@xterm/addon-fit';

/** ShellManager: Manages a persistent shell in the WebContainer */
class ShellManager {
  constructor() {
    this.persistentShell = null;
    this.shellInput = null;
    this.currentOutput = '';
    this.currentDirectory = '/';
    this.lastCommand = '';
  }

  async initialize(WebContainersInstance, terminal) {
    this.persistentShell = await WebContainersInstance.spawn('jsh');
    this.shellInput = this.persistentShell.input.getWriter();

    this.persistentShell.output
      .pipeTo(
        new WritableStream({
          write: (data) => {
            terminal.write(data);
            this.currentOutput += data;
            console.log('Shell output:', data);
          },
        })
      )
      .catch((err) => {
        console.error('Error piping shell output:', err);
      });

    this.persistentShell.exit.then((code) => {
      console.log('Shell exited with code:', code);
      this.persistentShell = null;
      this.shellInput = null;
    });
  }

  async sendCommand(terminal, command) {
    if (!this.persistentShell) {
      throw new Error('Shell not initialized');
    }
    
    command = command.trim();
    console.log('Command to execute:', command);
        
    try {
      this.currentOutput = '';
      console.log(`Executing command: ${command}`);
      terminal.write(`\n\n> ${command}\n`);
      
      this.lastCommand = command;
      await this.shellInput.write(`${command}\n`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      terminal.write(`\n📝 Output:\n${this.currentOutput.trim()}\n`);
      terminal.write(`\n✅ Completed: ${command}\n`);
      terminal.write('\n' + '-'.repeat(50) + '\n');
    } catch (error) {
      console.error('Error in command execution:', error);
      terminal.write(`\n❌ Fatal error: ${error.message}\n`);
    }
    
    iframe.src = iframe.src;
  }

  getCurrentDirectory() {
    return this.currentDirectory;
  }

  isReady() {
    return this.persistentShell !== null && this.shellInput !== null;
  }

  async cleanup() {
    if (this.shellInput) {
      await this.shellInput.close();
    }
    this.persistentShell = null;
    this.shellInput = null;
    this.currentOutput = '';
    this.currentDirectory = '/';
    this.lastCommand = '';
  }

  async getRecipeURL(terminal, urlToGet) {
    try {
      const response = await fetch(urlToGet);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const recipeContent = await response.text();
      await WebContainersInstance.fs.writeFile('/mysite/urlsite.recipe', recipeContent);
      console.log('Recipe file written successfully');
      recipeTextArea.value = recipeContent;
    } catch (error) {
      console.error('Error fetching or writing recipe:', error);
      throw error;
    }
  }

  async runRecipeURL(terminal, shellManager) {
    try {
      let playCommandRecipe = 'hax site recipe:play --recipe urlsite.recipe --y';
      if (!shellManager.currentOutput.includes('mysite')) {
        console.log('Not in mysite directory, will prepend cd command');
        playCommandRecipe = 'cd mysite && ' + playCommandRecipe;
      } else {
        console.log('Already in mysite directory, running play command directly');
      }
      
      if (!shellManager.persistentShell) {
        throw new Error('Shell not initialized');
      }
      
      try {
        terminal.write(`\n\n> ${playCommandRecipe}\n`);
        await shellManager.shellInput.write(`${playCommandRecipe}\n`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        terminal.write(`\n✅ Recipe playback initiated\n`);
        terminal.write('\n' + '-'.repeat(50) + '\n');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        iframe.src = iframe.src;
      } catch (error) {
        console.error('Error executing play command:', error);
        terminal.write(`\n❌ Error: ${error.message}\n`);
      }
    } catch (error) {
      console.error('Failed to process commands:', error);
      cmdTextArea.value = `Error: ${error.message}`;
    } finally {
      aiSpinner.style.display = 'none';
      submitButtonAI.disabled = false;
    }
  }

  async runRecipeDownload(terminal, shellManager) {
    try {
      console.log('Starting download process...');
      const filePath = '/mysite/newsite.recipe';
      const fileContent = await WebContainersInstance.fs.readFile(filePath);
      
      if (!fileContent || !fileContent.length) {
        throw new Error('File content is empty or invalid');
      }
      
      const contentArray = new Uint8Array(fileContent);
      const blob = new Blob([contentArray], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop();
      a.style.display = 'none';
      document.body.appendChild(a);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('Download process completed successfully');
    } catch (error) {
      console.error('Error in download process:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async launchInteractiveShell() {
    const shellWindow = window.open('', 'InteractiveShell', 'width=800,height=600');
    if (!shellWindow) {
      throw new Error('Failed to open window. Check popup blocker.');
    }

    try {
      shellWindow.document.open();
      shellWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Interactive Shell</title>
            <link rel="stylesheet" href="/node_modules/xterm/css/xterm.css" />
            <style>
              body { margin: 0; padding: 10px; background: #000; }
              #terminal { width: 100%; height: 100vh; }
            </style>
          </head>
          <body>
            <div id="terminal"></div>
            <script src="/node_modules/xterm/lib/xterm.js"></script>
            <script src="/node_modules/@xterm/addon-fit/lib/addon-fit.js"></script>
            <script>
              (function() {
                try {
                  window.addEventListener('load', () => {
                    if (!window.Terminal || !window.FitAddon) {
                      document.body.innerHTML = 'Error: Failed to load Xterm.js or FitAddon.';
                      console.error('Xterm.js or FitAddon not loaded');
                      return;
                    }
                    const terminal = new window.Terminal({
                      cursorBlink: true,
                      convertEol: true,
                      theme: { background: '#000000', foreground: '#FFFFFF' }
                    });
                    const fitAddon = new window.FitAddon.FitAddon();
                    terminal.loadAddon(fitAddon);
                    terminal.open(document.getElementById('terminal'));
                    fitAddon.fit();

                    window.terminalReady = terminal;
                    console.log('Terminal initialized in new window');
                    window.addEventListener('resize', () => fitAddon.fit());
                  });
                } catch (e) {
                  console.error('Error initializing terminal:', e);
                  document.body.innerHTML = 'Error: ' + e.message;
                }
              })();
            </script>
          </body>
        </html>
      `);
      shellWindow.document.close();

      const terminalReadyPromise = new Promise((resolve, reject) => {
        const maxWait = 5000;
        let elapsed = 0;
        const interval = 100;

        const checkReady = () => {
          if (shellWindow.terminalReady) {
            console.log('Terminal ready detected');
            resolve(shellWindow.terminalReady);
          } else if (elapsed >= maxWait) {
            reject(new Error('Timeout waiting for terminal to initialize'));
          } else {
            elapsed += interval;
            setTimeout(checkReady, interval);
          }
        };
        checkReady();
      });

      const terminal = await terminalReadyPromise;

      const interactiveShell = await WebContainersInstance.spawn('jsh');
      const shellInput = interactiveShell.input.getWriter();

      interactiveShell.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      ).catch(err => {
        console.error('Error piping shell output:', err);
        terminal.write(`\n❌ Shell error: ${err.message}\n`);
      });

      terminal.onData(data => {
        shellInput.write(data);
      });

      interactiveShell.exit.then(code => {
        terminal.write(`\nShell exited with code ${code}\n`);
        shellInput.close();
      });

      shellWindow.onunload = async () => {
        await shellInput.close();
        interactiveShell.kill();
      };

      terminal.write('Welcome to the Interactive Shell\n> ');
      terminal.focus();
    } catch (error) {
      console.error('Failed to set up interactive shell:', error);
      shellWindow.document.body.innerHTML = `Error: ${error.message}`;
      throw error;
    }
  }
}

// DOM references
const iframe = document.querySelector('iframe');
const aiTextArea = document.querySelector('#aiTextArea');
const submitButtonAI = document.querySelector('#submitButtonAI');
const cmdTextArea = document.querySelector('#cmdTextArea');
const submitButtonCMD = document.querySelector('#submitButtonCMD');
const terminalElement = document.querySelector('.terminal');
const aiSpinner = document.querySelector('#aiSpinner');
const recipeurlTextArea = document.querySelector('#recipeURLArea');
const submitButtonURL = document.querySelector('#recipeButtonURL');
const recipeTextArea = document.querySelector('#recipeTextArea');
const submitButtonRecipe = document.querySelector('#recipeButtonCMD');
const submitButtonRecipeDownload = document.querySelector('#recipeDownload');

let WebContainersInstance;

async function installDependencies(terminal) {
  const installProcess = await WebContainersInstance.spawn('npm', ['install']);
  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal.write(data);
    }
  }));
  return installProcess.exit;
}

async function startDevServer(terminal) {
  const serverProcess = await WebContainersInstance.spawn('npm', ['run', 'start']);
  serverProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal.write(data);
    }
  }));

  WebContainersInstance.on('server-ready', (port, url) => {
    iframe.src = url;
  });
}

/** Main entry point */
window.addEventListener('load', async () => {
  const terminal = new Terminal({ convertEol: true });
  terminal.open(terminalElement);

  aiTextArea.value = '';
  cmdTextArea.value = '';

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  fitAddon.fit();

  WebContainersInstance = await WebContainer.boot();
  await WebContainersInstance.mount(files);

  const shellManager = new ShellManager();
  await shellManager.initialize(WebContainersInstance, terminal);

  submitButtonAI.addEventListener('click', async () => {
    const query = 'I already have a site called mysite and ' + aiTextArea.value;
    aiSpinner.style.display = 'block';
    submitButtonAI.disabled = true;
    
    try {
      const psuCheckbox = document.getElementById('psuCheckbox');
      const commands = await (psuCheckbox.checked ? askICDSRemote(query) : askClaudeRemote(query));
      const recipeContent = Array.isArray(commands) ? commands.join('\n') : commands;
      await WebContainersInstance.fs.writeFile('/mysite/newsite.recipe', recipeContent);
      console.log('Recipe file written successfully');
      recipeTextArea.value = recipeContent;

      let playCommand = 'hax site recipe:play --recipe newsite.recipe --y';
      if (!shellManager.currentOutput.includes('mysite')) {
        console.log('Not in mysite directory, will prepend cd command');
        playCommand = 'cd mysite && ' + playCommand;
      } else {
        console.log('Already in mysite directory, running play command directly');
      }
      
      if (!shellManager.persistentShell) {
        throw new Error('Shell not initialized');
      }
      
      try {
        terminal.write(`\n\n> ${playCommand}\n`);
        await shellManager.shellInput.write(`${playCommand}\n`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        terminal.write(`\n✅ Recipe playback initiated\n`);
        terminal.write('\n' + '-'.repeat(50) + '\n');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        iframe.src = iframe.src;
      } catch (error) {
        console.error('Error executing play command:', error);
        terminal.write(`\n❌ Error: ${error.message}\n`);
      }
    } catch (error) {
      console.error('Failed to process commands:', error);
      cmdTextArea.value = `Error: ${error.message}`;
    } finally {
      aiSpinner.style.display = 'none';
      submitButtonAI.disabled = false;
    }
  });

  submitButtonCMD.addEventListener('click', async () => {
    const textValue = cmdTextArea.value;
    await shellManager.sendCommand(terminal, textValue);
  });

  submitButtonURL.addEventListener('click', async () => {
    const recipeURL = recipeurlTextArea.value;
    await shellManager.getRecipeURL(terminal, recipeURL);
  });

  submitButtonRecipe.addEventListener('click', async () => {
    await shellManager.runRecipeURL(terminal, shellManager);
  });
  
  submitButtonRecipeDownload.addEventListener('click', async () => {
    await shellManager.runRecipeDownload(terminal, shellManager);
  });

  const openShellButton = document.querySelector('#openShellWindow');
  openShellButton.addEventListener('click', async () => {
    try {
      await shellManager.launchInteractiveShell();
    } catch (error) {
      console.error('Failed to launch interactive shell:', error);
      terminal.write(`\n❌ Error: ${error.message}\n`);
    }
  });

  await installDependencies(terminal);
  await startDevServer(terminal);

  console.log('Window loaded');
});