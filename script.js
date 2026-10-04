const time = document.getElementById("time");
const classTime = document.getElementById("timeClass");
const hourHand = document.getElementById("hourHand");
const minHand = document.getElementById("minHand");
const secHand = document.getElementById("secHand");
const popup = document.getElementById("popup");
const popups = [];
let timeOffset = 0;
let lastSec = 0;
let HourSkip = true;
let popupRunning = false;
let wakeLock = null;
async function requestWakeLock() {
    if (!("wakeLock" in navigator)) {
        popupText(1, "This device does not support the Wake Lock API.");
        return;
    }
    try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
            wakeLock = null;
        });
    } catch(e) {
        popupText(3, `${e.name}: ${e.message}`);
    }
}
async function releaseWakeLock() {
    if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
    }
}
async function syncTime() {
    try {
        const response = await fetch("https://utctime.app/api/now");
        const data = await response.json();
        timeOffset = data.unix_ms - Date.now();
        popupText(2, `System misalignment: ${timeOffset}ms`);
    } catch(e) {
        popupText(3, `${e.name}: ${e.message}`);
    }
}
function createMinute() {
    for (let i = 0; i < 60; i++) {
        const Minute = document.createElement("div");
        if (i % 5 == 0) {
            Minute.className = "minuteLong";
            Minute.style.setProperty("--length", "4")
        } else {
            Minute.className = "minuteShort";
            Minute.style.setProperty("--length", "2")
        }
        Minute.style.setProperty("--minute-num", i);
        document.querySelector(".bg_overflow").appendChild(Minute);
    }
}
function updateMinuteColors(min, sec, ms) {
    const center = ((min + (sec + ms / 1000) / 60) * 60 / 5) % 60;
    document.querySelectorAll(".minuteLong, .minuteShort").forEach(el => {
        const num = Number(el.style.getPropertyValue("--minute-num"));
        let distance = Math.abs(num - center);
        distance = Math.min(distance, 60 - distance);
        const color = Math.max(0, 100 - distance * (100 / 30));
        el.style.setProperty("--color", `${color}%`);
    });
}
function time_def() {
    const now = new Date(Date.now() + timeOffset);
    const hour = now.getHours();
    const min = now.getMinutes();
    const sec = now.getSeconds();
    const ms = now.getMilliseconds();
    const hourTxt = String(hour).padStart(2, "0");
    const minTxt = String(min).padStart(2, "0");
    const secTxt = String(sec).padStart(2, "0");
    updateMinuteColors(min, sec, ms);
    if (HourSkip && !(min % 30 == 0 && sec <= 30)) {
        HourSkip = false;
    }
    if (!HourSkip && min % 30 == 0 && sec <= 30) {
        classTime.classList.add("hour");
    } else {
        classTime.classList.remove("hour");
    }
    if (sec == 0) {
        classTime.classList.add("min");
    } else {
        classTime.classList.remove("min");
        if (sec % 15 == 0 && ms < 500) {
            classTime.classList.add("sec");
        } else {
            classTime.classList.remove("sec");
        }
    }
    if (sec !== lastSec) {
        lastSec = sec;
        time.textContent = (`${hourTxt}:${minTxt}:${secTxt}`)
        classTime.classList.remove("sec3");
        void classTime.offsetWidth;
        classTime.classList.add("sec3");
    }
    const secDeg = (sec + ms / 1000) * 6;
    const minDeg = (min + sec / 60) * 6;
    const hourDeg = (hour % 12 + min / 60) * 30;
    hourHand.style.transform = `rotate(${hourDeg}deg)`;
    minHand.style.transform = `rotate(${minDeg}deg)`;
    secHand.style.transform = `rotate(${secDeg}deg)`;
    requestAnimationFrame(time_def);
}
document.body.addEventListener("click", async () => {
    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            await releaseWakeLock();
        } else {
            await requestWakeLock();
            await document.documentElement.requestFullscreen({
                navigationUI: "hide"
            });
        }
    } catch(e) {
        popupText(3, `${e.name}: ${e.message}`);
    }
});
(() => {
    try {
        let timer;
        const resetCursorTimer = () => {
            clearTimeout(timer);
            document.body.classList.remove("hideCursor");
            timer = setTimeout(() => {
                document.body.classList.add("hideCursor");
            }, 5000);
        };
        ["mousemove", "mousedown", "keydown", "touchstart"].forEach(event => {
            document.addEventListener(event, resetCursorTimer, { passive: true });
        });
        resetCursorTimer();
    } catch(e) {
        popupText(3, `${e.name}: ${e.message}`);
    }
})();

history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("scroll", () => {
    window.scrollTo(0, 0);
});


syncTime();
setInterval(syncTime, 1800000) // 30 Min
createMinute();
time_def();

// ==========
// Popup    |
// ==========
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// type = 1: info
// type = 2: log
// type = 3: error
function popupText(type, text) {
    if (type > 0 && type <= 3 && type % 1 == 0) {
        if (type == 1) {
            console.info(text);
            popups.push(`ℹ️ ${text}`);
            popupAni();
        } else if (type == 2) {
            console.log(text);
            popups.push(`📝 ${text}`);
            popupAni();
        } else {
            console.error(text);
            popups.push(`⚠️ ${text}`);
            popupAni();
        }
    }
}
async function popupAni() {
    if (popupRunning) return;
    popupRunning = true;
    while (popups.length > 0) {
        popup.textContent = popups[0];
        popup.classList.remove("show");
        void popup.offsetWidth;
        popup.classList.add("show");
        await sleep(10000);
        popups.splice(0, 1)
    }
    popup.classList.remove("show");
    popupRunning = false;
}