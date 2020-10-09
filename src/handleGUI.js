const { ipcRenderer } = require('electron');

const addVideosButton = document.getElementById('addVideosButton');
const videoList = document.getElementById('videoList');
const qualityRangeLabel = document.getElementById('qualityRangeLabel');
const qualityRange = document.getElementById('qualityRange');
const folder = document.getElementById('saveFolder');
const chooseFolderButton = document.getElementById('chooseFolderButton');
const convertButton = document.getElementById('convertButton');
const convertedVideoList = document.getElementById('convertedVideoList');
const convertButtonText = document.getElementById('convertButtonText');
const openConvertedButtton = document.getElementById('openConvertedButton');
const resetButton = document.getElementById('resetButton');

// when user click add videos button, trigger an event in the main process
addVideosButton.addEventListener('click', event => {
  ipcRenderer.send('addVideos');
});

// update video list on html
ipcRenderer.on('updateVideos', (event, videos) => {
  videoList.innerHTML = '';
  if (videos.length === 0) addVideo({ name: 'No video(s) chosen...' }, 0, true);
  else
    videos.forEach((video, i) => {
      addVideo(video, i);
    });
});

// update quality range label depending on the input
qualityRange.addEventListener('input', event => {
  qualityRangeLabel.innerText = `3. Quality Conversion (higher is better): ${Math.round(
    (Number(event.target.value) * 100) / 34
  )}%`;
  ipcRenderer.send('updateQuality', Number(event.target.value));
});

// when user click choose folder button, trigger an event in the main process
chooseFolderButton.addEventListener('click', event => {
  ipcRenderer.send('chooseFolder');
});

// update the label of the folder
ipcRenderer.on('updateFolder', (event, savePath) => {
  folder.innerHTML = savePath;
});

// when user clicks the convert button, send the selected format and resolution
convertButton.addEventListener('click', event => {
  const formats = document.querySelectorAll('input[name=chooseVideoFormat]');
  const resolutions = document.querySelectorAll(
    'input[name=chooseVideoResolution]'
  );
  const colors = document.querySelectorAll('input[name=chooseVideoInvert]');
  const audioOptions = document.querySelectorAll('input[name=chooseAudio]');
  let format = '';
  let resolution = '';
  let color = '';
  let audio = '';
  formats.forEach(({ value, checked }) => {
    if (checked) format = value;
  });
  resolutions.forEach(({ value, checked }) => {
    if (checked) resolution = value;
  });
  colors.forEach(({ value, checked }) => {
    if (checked) color = value;
  });
  audioOptions.forEach(({ value, checked }) => {
    if (checked) audio = value;
  });
  ipcRenderer.send('convertVideos', format, resolution, color, audio);
});

ipcRenderer.on('updateConvertButton', (event, update) => {
  convertButton.disabled = update[0];
  if (update[1]) {
    convertButtonText.innerHTML = '';
    convertButtonText.appendChild(loadingIcon(true));
    convertButtonText.appendChild(loadingIcon(false));
  } else {
    convertButtonText.innerHTML = '5. Convert';
  }
});

openConvertedButtton.addEventListener('click', event => {
  ipcRenderer.send('openConverted');
});

ipcRenderer.on('updateOpenConvertedButton', (event, show) => {
  if (show) {
    openConvertedButtton.classList.remove('d-none');
    resetButton.classList.remove('d-none');
  } else {
    openConvertedButtton.classList.add('d-none');
    resetButton.classList.add('d-none');
  }
});

ipcRenderer.on('updateConvertedVideos', (event, convertedVideos) => {
  convertedVideoList.innerHTML = '';
  if (convertedVideos.length === 0)
    addConvertedVideo({ name: 'No video(s) converted...' }, true);
  else
    convertedVideos.forEach(video => {
      addConvertedVideo(video);
    });
});

resetButton.addEventListener('click', event => {
  ipcRenderer.send('resetCycle');
});

const addVideo = (item, i, setNoVideos) => {
  const listItem = document.createElement('li');

  const wrapperRow = document.createElement('div');
  wrapperRow.classList.add('row');

  const firstColumn = document.createElement('div');
  firstColumn.classList.add('col-9');

  const name = document.createElement('h3');
  name.classList.add('text-break');
  name.innerHTML = item.name;

  firstColumn.appendChild(name);
  wrapperRow.appendChild(firstColumn);

  if (!setNoVideos) {
    const secondColumn = document.createElement('div');
    secondColumn.classList.add('col-3', 'text-right');

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-trash', 'text-danger', 'clickable');
    icon.addEventListener('click', () => {
      ipcRenderer.send('removeVideo', i);
    });

    const size = document.createElement('h3');
    size.innerHTML = `${item.size} MB `;
    size.appendChild(icon);

    secondColumn.appendChild(size);
    wrapperRow.appendChild(secondColumn);
  }

  listItem.appendChild(wrapperRow);

  videoList.appendChild(listItem);
};

const addConvertedVideo = (item, setNoVideos) => {
  const listItem = document.createElement('li');

  const wrapperRow = document.createElement('div');
  wrapperRow.classList.add('row');

  const firstColumn = document.createElement('div');
  firstColumn.classList.add('col');

  const name = document.createElement('h3');
  name.innerHTML = item.name;

  firstColumn.appendChild(name);
  wrapperRow.appendChild(firstColumn);

  if (!setNoVideos) {
    const secondColumn = document.createElement('div');
    secondColumn.classList.add('col', 'text-right');

    const icon = document.createElement('i');
    if (item.comparison === 'larger')
      icon.classList.add('fas', 'fa-arrow-alt-circle-up', 'text-danger');
    else if (item.comparison === 'smaller')
      icon.classList.add('fas', 'fa-arrow-alt-circle-down', 'text-success');
    else icon.classList.add('fas', 'fa-minus', 'text-info');

    const size = document.createElement('h3');
    size.innerHTML = `${item.size} MB `;
    size.appendChild(icon);

    secondColumn.appendChild(size);
    wrapperRow.appendChild(secondColumn);
  }

  listItem.appendChild(wrapperRow);

  convertedVideoList.appendChild(listItem);
};

const loadingIcon = icon => {
  if (icon) {
    const loading = document.createElement('span');
    loading.classList.add('spinner-border');
    loading.setAttribute('role', 'status');
    loading.setAttribute('aria-hidden', 'true');
    return loading;
  }
  return document.createTextNode(' Loading...');
};
