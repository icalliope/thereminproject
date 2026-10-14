function frekansaCevir(y) {
    const minFreq = 220;
    const maxFreq = 880;
    return maxFreq - y * (maxFreq - minFreq);
}

function frekansiNotayaCevir(frequency) {
    const notalar = [
        { isim: "C4", frekans: 261.63 },
        { isim: "C#4", frekans: 277.18 },
        { isim: "D4", frekans: 293.66 },
        { isim: "D#4", frekans: 311.13 },
        { isim: "E4", frekans: 329.63 },
        { isim: "F4", frekans: 349.23 },
        { isim: "F#4", frekans: 369.99 },
        { isim: "G4", frekans: 392.00 },
        { isim: "G#4", frekans: 415.30 },
        { isim: "A4", frekans: 440.00 },
        { isim: "A#4", frekans: 466.16 },
        { isim: "B4", frekans: 493.88 },
        { isim: "C5", frekans: 523.25 },
        { isim: "C#5", frekans: 554.37 },
        { isim: "D5", frekans: 587.33 },
        { isim: "D#5", frekans: 622.25 },
        { isim: "E5", frekans: 659.25 },
        { isim: "F5", frekans: 698.46 },
        { isim: "F#5", frekans: 739.99 },
        { isim: "G5", frekans: 783.99 },
        { isim: "G#5", frekans: 830.61 },
        { isim: "A5", frekans: 880.00 }
    ];

    let enYakinNota = notalar[0];

    notalar.forEach((nota) => {
        if (
            Math.abs(nota.frekans - frequency) <
            Math.abs(enYakinNota.frekans - frequency)
        ) {
            enYakinNota = nota;
        }
    });

    return enYakinNota;
}

const video = document.querySelector("#videoElemani");
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

const notaElement = document.querySelector("#nota");
const frekansElement = document.querySelector("#frekans");
const frekansDeger = document.querySelector("#frekansDeger");
const sesDeger = document.querySelector("#sesDeger");

const frekansBar = document.querySelector("#frekansBar");
const sesBar = document.querySelector("#sesBar");
const notaIsaret = document.querySelector("#notaIsaret");

const baslaBtn = document.querySelector("#baslaBtn");

let audioContext = null;
let oscillator = null;
let gainNode = null;

function sesiBaslat() {
    audioContext = new AudioContext();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 440;

    gainNode.gain.value = 0;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {
        if (gainNode) {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        }

        notaElement.textContent = "--";
        frekansElement.textContent = "0.00 Hz";
        frekansDeger.textContent = "0.00 Hz";
        sesDeger.textContent = "0%";

        frekansBar.style.width = "0%";
        sesBar.style.width = "0%";
        notaIsaret.style.left = "0%";

        return;
    }

    results.multiHandLandmarks.forEach((landmarks, index) => {
        const handType = results.multiHandedness[index].label;

        // SAĞ EL → FREKANS
        if (handType === "Right") {
            const indexFinger = landmarks[8];
            const y = indexFinger.y;
            const frequency = frekansaCevir(y);

            if (oscillator) {
                oscillator.frequency.setTargetAtTime(
                    frequency,
                    audioContext.currentTime,
                    0.06
                );
            }

            frekansElement.textContent = frequency.toFixed(2) + " Hz";
            frekansDeger.textContent = frequency.toFixed(2) + " Hz";

            const nota = frekansiNotayaCevir(frequency);
            notaElement.textContent = nota.isim;

            const frekansYuzdesi =
                ((frequency - 220) / (880 - 220)) * 100;

            const sinirliFrekansYuzdesi =
                Math.max(0, Math.min(100, frekansYuzdesi));

            frekansBar.style.width =
                sinirliFrekansYuzdesi + "%";

            notaIsaret.style.left =
                sinirliFrekansYuzdesi + "%";
        }

        // SOL EL → SES YÜKSEKLİĞİ
        if (handType === "Left") {
            const palmY = landmarks[9].y;
            const volume = 1 - palmY;

            const volumeLevel =
                Math.max(0, Math.min(1, volume));

            const volumePercentage =
                volumeLevel * 100;

            if (gainNode) {
                gainNode.gain.setTargetAtTime(
                    volumeLevel * 0.15,
                    audioContext.currentTime,
                    0.06
                );
            }

            sesDeger.textContent =
                Math.round(volumePercentage) + "%";

            sesBar.style.width =
                volumePercentage + "%";
        }

        // EL İSKELETİ
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [5, 9], [9, 10], [10, 11], [11, 12],
            [9, 13], [13, 14], [14, 15], [15, 16],
            [13, 17], [17, 18], [18, 19], [19, 20],
            [0, 17]
        ];

        ctx.beginPath();

        connections.forEach(([start, end]) => {
            const x1 = landmarks[start].x * canvas.width;
            const y1 = landmarks[start].y * canvas.height;
            const x2 = landmarks[end].x * canvas.width;
            const y2 = landmarks[end].y * canvas.height;

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        });

        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.stroke();

        // LANDMARK NOKTALARI
        landmarks.forEach((point) => {
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);

            ctx.fillStyle = "white";
            ctx.fill();
        });
    });
});

async function kamerayiBaslat() {
    try {
        const akis = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = akis;

        video.addEventListener("loadeddata", async () => {
            while (true) {
                await hands.send({
                    image: video
                });

                await new Promise(resolve =>
                    requestAnimationFrame(resolve)
                );
            }
        });
    } catch (hata) {
        console.error("Kameraya erişilemedi:", hata);
        alert("Kamera açılamadı.");
    }
}

baslaBtn.addEventListener("click", () => {
    sesiBaslat();
    kamerayiBaslat();
});