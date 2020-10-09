const { ipcMain, dialog, shell } = require('electron');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const isWindows = process.platform === 'win32';
const toMB = number =>
  isWindows ? (number / 1048576.0).toFixed(2) : (number / 1000000.0).toFixed(2);

const videos = [];
const convertedVideos = [];
let crf = 34;
let savePath = '';

ipcMain.on('addVideos', event => {
  // open file explorer for user to select videos
  dialog
    .showOpenDialog({
      title: 'Choose video(s)...',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Videos',
          extensions: ['mkv', 'avi', 'mp4', 'mov', 'flv']
        }
      ]
    })
    .then(res => {
      if (!res.canceled) {
        // once videos are selected, add them to global variable and send them to rendererProcess
        addVideos(res.filePaths);
        // trigger an event in the renderer process
        event.reply('updateVideos', videos);

        if (savePath !== '') event.reply('updateConvertButton', [false, false]);
      }
    });
});

ipcMain.on('removeVideo', (event, i) => {
  // get the index as an argument and remove the video in that index
  videos.splice(i, 1);
  // tell the front-end to update as well
  event.reply('updateVideos', videos);
  // if no video remains in the list, disable the convert button
  if (videos.length === 0) event.reply('updateConvertButton', [true, false]);
});

ipcMain.on('updateQuality', (event, quality) => {
  crf = 51 - quality;
});

ipcMain.on('chooseFolder', event => {
  dialog
    .showOpenDialog({
      title: 'Choose folder...',
      properties: ['openDirectory']
    })
    .then(res => {
      if (!res.canceled) {
        // once videos are selected, add them to global variable and send them to rendererProcess
        savePath = res.filePaths[0];
        // tell the front-end to update save folder
        event.reply('updateFolder', savePath);
        // if there are videos on the list, activate the convert button
        if (videos.length > 0)
          event.reply('updateConvertButton', [false, false]);
      }
    });
});

// convert videos
ipcMain.on(
  'convertVideos',
  async (event, format, resolution, invert, audio) => {
    // disable button
    event.reply('updateConvertButton', [true, true]);

    const promises = [];

    for (let i = 0; i < videos.length; i++) {
      const promise = new Promise((resolve, reject) => {
        const videoFile = path.basename(videos[i].name);

        const name = videoFile.slice(0, videoFile.length - 4) + '.' + format;

        const saveName = path.join(savePath, name);
        const options = ['-i', videos[i].name, '-c:v'];

        if (format === 'flv') options.push('libx264');
        else options.push('libx265');

        if (resolution !== 'keep' && invert !== 'keep')
          options.push(...['-vf', `scale=${resolution}:-2,negate`]);
        else if (resolution !== 'keep' && invert === 'keep')
          options.push(...['-vf', `scale=${resolution}:-2`]);
        else if (resolution === 'keep' && invert !== 'keep')
          options.push(...['-vf', `negate`]);

        options.push(...['-preset', 'ultrafast', '-crf', crf.toString()]);

        if (audio === 'keep') options.push(...['-c:a', 'copy']);
        else options.push('-an');

        options.push(...[saveName, '-hide_banner']);

        const task = spawn('ffmpeg', options);

        task.on('close', code => {
          if (code === 0) {
            const size = Number(toMB(fs.statSync(saveName)['size']));
            let comparison;
            if (size > videos[i].size) comparison = 'larger';
            else if (size < videos[i].size) comparison = 'smaller';
            else comparison = 'same';
            convertedVideos.push({
              name: saveName,
              size,
              comparison
            });
            resolve(true);
          } else reject(false);
        });
      });
      promises.push(promise);
    }
    await Promise.all(promises);

    event.reply('updateConvertedVideos', convertedVideos);
    event.reply('updateConvertButton', [true, false]);
    event.reply('updateOpenConvertedButton', true);
  }
);

ipcMain.on('openConverted', event => {
  shell.openPath(savePath);
});

ipcMain.on('resetCycle', event => {
  videos.splice(0, videos.length);
  convertedVideos.splice(0, convertedVideos.length);
  event.reply('updateVideos', videos);
  event.reply('updateConvertButton', [true, false]);
  event.reply('updateConvertedVideos', convertedVideos);
  event.reply('updateOpenConvertedButton', false);
});

const addVideos = newVideos => {
  newVideos.forEach(newVideo => {
    if (videos.findIndex(video => video.name === newVideo) < 0) {
      const size = Number(toMB(fs.statSync(newVideo)['size']));
      videos.push({ name: newVideo, size });
    }
  });
};
