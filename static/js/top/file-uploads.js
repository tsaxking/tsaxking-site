
/**
 * Read files and return a bin of data
 *
 * @async
 * @param {HTMLInputElement} input - input[type=file]
 * @param {String[]} [accept=[]] - Array of accepted file extensions
 * @returns {Promise<Object[]>} - Array of objects containing filename, data, and extension

 */
async function readFiles(input, accept = []) {
    if (!input.querySelector) throw new Error('input must be a node!');
    const { files } = input;

    var reader = new FileReader();
    return await Promise.all(Array.from(files).map(async(file) => {
        const splitName = file.name.split('.');
        const ext = splitName[splitName.length - 1];
        if (!accept.find(a => a.toLowerCase() == ext.toLowerCase())) {
            alert('File type not accepted!');
            return;
        }

        return await new Promise((resolve, reject) => {
            reader.onloadend = (e) => {
                // get file content
                resolve({
                    filename: file.name,
                    data: e.target.result,
                    extension: ext
                });
            }
            reader.readAsBinaryString(file);
        });
    }));
}

/**
 * Turns a number into a byte string
 *
 * @param {Number} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 * 
 * @example
 * formatBytes(1024); // 1 KB
 * formatBytes(1234); // 1.21 KB
 * formatBytes(1234, 3); // 1.205 KB
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (parseFloat((bytes / Math.pow(k, i)).toFixed(dm))) + ' ' + sizes[i];
}

/**
 * View an image from a file upload
 *
 * @param {HTMLInputElement} input - input[type=file]
 * @param {HTMLImageElement} target - img element
 */
function viewImageFromFileUpload(input, target) {
    if (input.files.length > 0) {
        var reader = new FileReader();

        reader.onload = function(e) {
            target.setAttribute('src', e.target.result);
        };

        reader.readAsDataURL(input.files[0]);
    }
}

/**
 * Streams a file to the server (works in tandem with get-file.js:fileStream)
 * 
 * @param {String} url Url to upload to 
 * @param {HTMLInputElement} fileInput File input element
 * @param {Object} options Options
 * @returns {Promise}
 */
function fileStream(url, fileInput, options = {}) {
    if (typeof url !== 'string') throw new Error('url must be a string!');
    if (!fileInput.querySelector) throw new Error('fileInput must be a node!');

    return new Promise(async (resolve, reject) => {
        const ping = new Ping();
        await ping.run();
        if (ping.latency > 1000) {
            const confirmation = await CustomBootstrap.confirm('Poor internet connection! Are you sure you want to continue?');
            if (!confirmation) {
                // remove files
                fileInput.value = '';
                return reject('Poor internet connection!');
            }
        }

        // uploads a file to the server through a stream
        const { files } = fileInput;

        const pb = new CustomBootstrap.ProgressBar();

        const streamFile = (index) => {
            const file = files[index];
            if (!file) {
                pb.destroy();
                return resolve();
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            let filename = file.name.split('.');
            filename.pop();
            filename = filename.join('.');

            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('X-File-Name', filename);
            xhr.setRequestHeader('X-File-Size', file.size);
            xhr.setRequestHeader('X-File-Type', file.type);
            xhr.setRequestHeader('X-File-Index', index);
            xhr.setRequestHeader('X-File-Count', files.length);
            xhr.setRequestHeader('X-File-Name', file.name);
            xhr.setRequestHeader('X-File-Ext', file.name.split('.').pop());

            if (options.headers) {
                Object.keys(options.headers).forEach((key) => {
                    xhr.setRequestHeader('X-Custom-' + key, options.headers[key]);
                });
            }

            xhr.onload = (e) => {
                streamFile(index + 1);
            }

            xhr.onerror = (e) => {
                pb.destroy();
                CustomBootstrap.alert('Error uploading file!', 'danger', 'Error');
                reject(e);
            }

            xhr.upload.onprogress = (e) => {

                const totalFiles = files.length;
                const percent = (e.loaded / e.total);
                const percentTotal = (index / totalFiles) + (percent / totalFiles);
                pb.progress = Math.round(percentTotal * 100);
            }

            xhr.onreadystatechange = (e) => {
                if (xhr.readyState == 4) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        CustomBootstrap.notify(response);
                    } catch (e) {
                        console.error(e);
                        const { responseText } = xhr;
                        CustomBootstrap.notify(responseText);
                    }
                    
                }
            }

            xhr.send(file);
        };

        streamFile(0);
    });
}