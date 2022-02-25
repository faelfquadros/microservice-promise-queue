const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const maxParallelProcs = 2;
let runningProcs = [];

async function runBigProcessInQueue() {
    if (runningProcs.length >= maxParallelProcs) {
        console.log('Queue is full, waiting some process to be done!');
        await runningProcs[0];
        return runBigProcessInQueue();
    }

    console.log('Running proc...');

    const promise = runBigProcess();
    runningProcs.push(promise);

    function removePromise() {
        console.log('Proc done, removing proc');
        runningProcs = runningProcs.filter(p => p !== promise);
    }

    let result;
    try {
        result = await promise;
        removePromise();
    } catch (error) {
        removePromise();
        throw error;
    }

    return result;
}

async function runBigProcess() {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.resolve(__dirname, 'sub-process.js')
        ])

        const stderr = [];

        proc.on('error', (error) => reject(error));
        proc.stderr.on('data', (chunk) => stderr.push(chunk));
        proc.stdout.on('data', (chunk) => { });

        proc.on('close', () => {
            if (stderr.length) {
                return reject(stderr.join(''));
            }
            resolve();
        })
    })
}

http.createServer(async (req, res) => {
    if (req.url === '/took') {
        const startedProcess = new Date();
        await runBigProcessInQueue();
        console.log(`This process tooked ${new Date() - startedProcess}ms to end`)
        return res.end('tooked')
    }
    res.end('Not tooked');
}).listen(3000, () => console.log("We're on fire 🔥 !!"));