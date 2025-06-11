let isScriptRunning = false;

// Environment management functions
async function loadEnvironments() {
  try {
    const environments = await window.myApi.getAvailableEnvironments();
    const selector = document.getElementById('environment-selector');
    
    // Clear existing options
    selector.innerHTML = '';
    
    if (environments.length === 0) {
      selector.innerHTML = '<option value="">No environments found</option>';
      return;
    }
    
    // Add environment options
    environments.forEach(env => {
      const option = document.createElement('option');
      option.value = env.name;
      option.textContent = env.name;
      selector.appendChild(option);
    });
    
    // Set current environment
    const currentEnv = await window.myApi.getCurrentEnvironment();
    selector.value = currentEnv || 'default';
    
  } catch (error) {
    console.error('Error loading environments:', error);
    document.getElementById('environment-selector').innerHTML = '<option value="">Error loading environments</option>';
  }
}

async function switchEnvironment(envName) {
  try {
    const configPath = await window.myApi.setCurrentEnvironment(envName);
    console.log(`Switched to environment: ${envName} (${configPath})`);
    
    // Update display if configuration info is shown
    await updateConfigurationDisplay();
  } catch (error) {
    console.error('Error switching environment:', error);
  }
}

async function updateConfigurationDisplay() {
  try {
    const configPath = await window.myApi.getCurrentConfigPath();
    const exists = await window.myApi.checkFileExists(configPath);
    
    if (exists) {
      const confFileContent = await window.myApi.readFile(configPath);
      const hostname = confFileContent.match(/hostname=(.+)/);
      
      // Update any existing configuration display
      const existingDiv = document.querySelector('#config-display');
      if (existingDiv) {
        existingDiv.remove();
      }
      
      if (hostname) {
        const div = document.createElement('div');
        div.id = 'config-display';
        div.style.marginTop = '20px';

        const hostnameLabel = document.createElement('strong');
        hostnameLabel.textContent = 'Current Host: ';
        div.appendChild(hostnameLabel);

        const hostnameText = document.createTextNode(hostname[1]);
        div.appendChild(hostnameText);

        const lineBreak = document.createElement('br');
        div.appendChild(lineBreak);

        const message = document.createElement('strong');
        message.textContent = 'Configuration file: ';
        div.appendChild(message);

        const confFileLink = document.createElement('a');
        confFileLink.href = `file://${configPath}`;
        confFileLink.textContent = `"${configPath}"`;
        confFileLink.target = '_blank'; 
        div.appendChild(confFileLink);

        const reconfigureButton = document.getElementById('reconfigure');
        reconfigureButton.parentNode.insertBefore(div, reconfigureButton.nextSibling);
      }
    }
  } catch (error) {
    console.error('Error updating configuration display:', error);
  }
}

window.onload = async () => {
  try {
    // Get the start button and disable it by default
    const startButton = document.getElementById('start');
    startButton.disabled = true;
    startButton.style.color = '#a8a8a8';
    startButton.style.fontWeight = 'bold';
    startButton.style.backgroundColor = '#f8f8f8';

    // Get the path to .gh-api-examples.conf in the user data directory
    const userDataPath = await window.myApi.getUserDataPath();
    const confFilePath = await window.myApi.joinPath(userDataPath, '.gh-api-examples.conf');

    // Store confFilePath in localStorage
    localStorage.setItem('configFilePath', confFilePath);

    // Check if .gh-api-examples.conf exists
    const exists = await window.myApi.checkFileExists(confFilePath);
    const shell = document.getElementById('shell');
    if (exists) {
      // .gh-api-examples.conf exists
      shell.innerText = 'The Power is already configured. Press Start to proceed or Reconfigure if you wish to set up a new instance or token.';
      window.dispatchEvent(new Event('configComplete'));
    } else {
      // .gh-api-examples.conf does not exist
      // Start the interactive shell
  
       // Specify the path to the Python interpreter installed by Homebrew
       const pythonInterpreterPath = 'python3';
//Python check is not working
//const pythonVersionResult = await window.myApi.runInteractiveScript(null, ['--version']).catch(error => error);
//if (pythonVersionResult.error) {
  // Python is not installed
//  shell.innerText = 'Please install Python.';
//} else {
  // Python is installed
  // Run python3 configure.py
  shell.innerText = `Running ${pythonInterpreterPath} configure.py...`;
  await window.myApi.runInteractiveScript(`configure.py`, ['--confpath', userDataPath]);

  window.myApi.safeIpc.on('script-complete', () => {
    window.dispatchEvent(new Event('configComplete'));
  });
   //   }
      }
    } catch (error) {
        console.error('An error occurred:', { message: error.message, stack: error.stack });
    }
  
    // Initialize input buffer
    let inputBuffer = '';
  

    // Listen for keypress events
    window.addEventListener('keypress', (event) => {
    const shell = document.getElementById('shell');
  
    if (event.key === 'Enter') {
      // Send the accumulated input to the Python process's stdin
      window.myApi.writeToPythonStdin(inputBuffer);
      shell.innerText += '\n'; // Move to the next line
      inputBuffer = '';
    } else {
      // Accumulate the key pressed by the user
      inputBuffer += event.key;
      // Display the current input buffer
      shell.innerText = shell.innerText.split('\n').slice(0, -1).join('\n') + '\n' + inputBuffer;
    }
  });
  // Listen for keydown events for backspace
  window.addEventListener('keydown', (event) => {
    const shell = document.getElementById('shell');

    if (event.key === 'Backspace') {
      // Remove the last character from the input buffer
      inputBuffer = inputBuffer.slice(0, -1);
      // Display the current input buffer
      shell.innerText = shell.innerText.split('\n').slice(0, -1).join('\n') + '\n' + inputBuffer;
      event.preventDefault(); // Prevent the backspace key from navigating back
    }
  });

  // Listen for paste events
  window.addEventListener('paste', (event) => {
    const pasteData = event.clipboardData.getData('text');
    inputBuffer += pasteData; // Add the pasted data to the input buffer
    // Display the current input buffer
    const shell = document.getElementById('shell');
    shell.innerText = shell.innerText.split('\n').slice(0, -1).join('\n') + '\n' + inputBuffer;
  });

  // Initialize environment selection
  await loadEnvironments();

  };
  
 // Listen for the configComplete event
 window.addEventListener('configComplete', async () => {
  await loadEnvironments(); // Reload environments after configuration
  
  const userDataPath = await window.myApi.getUserDataPath();
  const confFilePath = await window.myApi.joinPath(userDataPath, '.gh-api-examples.conf');
  const existsAfterConfig = await window.myApi.checkFileExists(confFilePath);
  if (existsAfterConfig) {
    const startButton = document.getElementById('start');
    startButton.disabled = false;
    startButton.style.color = 'black';
    startButton.style.backgroundColor = 'lightgreen';

    await updateConfigurationDisplay();
  }

});



  // Listen for console-log events
  window.myApi.onConsoleLog((data) => {
    const shell = document.getElementById('shell');
    shell.innerText += `\n${data.output}`;
  
    if (data.showCursor) {
      shell.classList.add('blinking-cursor');
    } else {
      shell.classList.remove('blinking-cursor');
    }
  });
 
  // // Listen for script-complete events
  // window.myApi.onScriptComplete(() => {
  //   isScriptRunning = false;
  // });