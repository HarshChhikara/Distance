/* CANVAS */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;
const BOARD_SIZE = 300;


/* GAME CONFIGURATION */

const GAME_CONFIG = {

    pixelsPerCm: 20,

    minDistance: 20,

    maxDistance: 300,

    centerTolerance: 45,

    edgeMargin: 35,

    axisToleranceDegrees: 10,

    pointRadius: 7,

    maxGenerationAttempts: 100,

    maxAttempts: 5,

    correctTolerance: 0.1
};


/* COLORS */

const POINT_COLOR =
    "#CA7DFD";

const LABEL_COLOR =
    "#ffffff";

const LABEL_FONT =
    "bold 22px Arial";


/* STORAGE */

const STATS_STORAGE_KEY =
    "distanceWtfStats";

const DAILY_COMPLETION_PREFIX =
    "distanceWtfCompleted_";

const SHARE_STORAGE_PREFIX =
    "distanceWtfShare_";

const GAME_URL =
    "https://distance.wtf";
  
/* DEFAULT STATISTICS */

const DEFAULT_STATS = {

    gamesPlayed: 0,

    gamesWon: 0,

    currentStreak: 0,

    bestStreak: 0,

    totalWinningGuesses: 0,

    guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
    },

    lastWinDate: null
};


/* GAME STATE */

let currentPuzzle = null;

let attemptsUsed = 0;

let gameOver = false;

let resultRecorded = false;

/* ANALYTICS */

function trackAnalytics(
    eventName,
    eventData = null
) {

    if (
        !window.umami ||
        typeof window.umami.track !== "function"
    ) {
        return;
    }


    if (eventData) {

        window.umami.track(
            eventName,
            eventData
        );

    } else {

        window.umami.track(
            eventName
        );
    }
}


/* TODAY LOCAL DATE */

function getTodayLocalDate() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


/* CURRENT DAILY DATE */

function getCurrentDailyDate() {

    return getTodayLocalDate();
}


/* DATE DIFFERENCE */

function getDateDifferenceInDays(
    olderDate,
    newerDate
) {

    const first =
        new Date(
            `${olderDate}T00:00:00Z`
        );

    const second =
        new Date(
            `${newerDate}T00:00:00Z`
        );

    const difference =
        second.getTime() -
        first.getTime();

    return Math.round(
        difference /
        (1000 * 60 * 60 * 24)
    );
}

/* REFRESH CURRENT STREAK */

function refreshCurrentStreak() {

    const stats =
        getStats();

    if (
        !stats.lastWinDate
    ) {

        stats.currentStreak =
            0;

        saveStats(
            stats
        );

        return;
    }


    const today =
        getCurrentDailyDate();


    const daysSinceLastWin =
        getDateDifferenceInDays(

            stats.lastWinDate,

            today
        );

    if (
        daysSinceLastWin > 1
    ) {

        stats.currentStreak =
            0;


        saveStats(
            stats
        );
    }
}

/* DAILY COMPLETION KEY */

function getDailyCompletionKey(
    dateString = null
) {

    const date =
        dateString ||
        getTodayLocalDate();

    return (
        DAILY_COMPLETION_PREFIX +
        date
    );
}


/* CHECK IF DAILY PUZZLE IS COMPLETED */

function isDailyPuzzleCompleted(
    dateString = null
) {

    return (
        localStorage.getItem(
            getDailyCompletionKey(
                dateString
            )
        ) === "true"
    );
}


/* MARK DAILY PUZZLE COMPLETED */

function markDailyPuzzleCompleted(
    dateString = null
) {

    localStorage.setItem(
        getDailyCompletionKey(
            dateString
        ),
        "true"
    );
}

/* =========================================================
   DAILY SHARE STORAGE KEY
   ========================================================= */

function getDailyShareKey(
    dateString = null
) {

    const date =
        dateString ||
        getTodayLocalDate();


    return (
        SHARE_STORAGE_PREFIX +
        date
    );
}


/* =========================================================
   TEMPERATURE → SHARE PROGRESS BAR
   ========================================================= */

function getShareProgressBar(
    temperatureElement
) {

    if (
        temperatureElement.classList.contains(
            "correct"
        )
    ) {
        return "🟪🟪🟪🟪🟪";
    }


    if (
        temperatureElement.classList.contains(
            "almost"
        )
    ) {
        return "🟧🟧🟧🟧🟧";
    }


    if (
        temperatureElement.classList.contains(
            "boiling"
        )
    ) {
        return "🟧🟧🟧🟧⬜";
    }


    if (
        temperatureElement.classList.contains(
            "hot"
        )
    ) {
        return "🟧🟧🟧⬜⬜";
    }


    if (
        temperatureElement.classList.contains(
            "warm"
        )
    ) {
        return "🟧🟧⬜⬜⬜";
    }


    if (
        temperatureElement.classList.contains(
            "cool"
        )
    ) {
        return "🟧⬜⬜⬜⬜";
    }


    return "⬜⬜⬜⬜⬜";
}


/* =========================================================
   BUILD SHARE RESULT
   ========================================================= */

function buildDailyShareText(
    won
) {

    const rows =
        document.querySelectorAll(
            "#guessHistory .guess-row"
        );


    const shareRows =
        [];


    rows.forEach(
        (row) => {

            const directionElement =
                row.querySelector(
                    ".guess-direction"
                );


            const temperatureElement =
                row.querySelector(
                    ".guess-temperature"
                );


            if (
                !directionElement ||
                !temperatureElement
            ) {
                return;
            }


            /*
               Build the closeness bar.
            */

            const progressBar =
                getShareProgressBar(
                    temperatureElement
                );


            /*
               Convert game direction
               into share-friendly symbols.
            */

            let direction =
                directionElement
                    .textContent
                    .trim();


            if (
                direction === "↑"
            ) {

                direction = "⬆️";

            } else if (
                direction === "↓"
            ) {

                direction = "⬇️";

            } else {

                direction = "✅";
            }


            shareRows.push(
                `${direction} ${progressBar}`
            );
        }
    );


    const score =
        won
            ? `${attemptsUsed}/${GAME_CONFIG.maxAttempts}`
            : `X/${GAME_CONFIG.maxAttempts}`;


    return [

        `DISTANCE.WTF ${getTodayLocalDate()}`,

        "",

        ...shareRows,

        "",

        score,

        "",

        GAME_URL

    ].join(
        "\n"
    );
}


/* =========================================================
   SAVE DAILY SHARE RESULT
   ========================================================= */

function saveDailyShareText(
    text
) {

    localStorage.setItem(

        getDailyShareKey(),

        text
    );
}


/* =========================================================
   GET DAILY SHARE RESULT
   ========================================================= */

function getDailyShareText() {

    return localStorage.getItem(
        getDailyShareKey()
    );
}


/* =========================================================
   UPDATE SHARE BUTTON
   ========================================================= */

function updateShareButton() {

    if (
        !shareResultButton
    ) {
        return;
    }


    const shareText =
        getDailyShareText();


    shareResultButton.disabled =
        !shareText;
}


/* =========================================================
   COPY SHARE RESULT
   ========================================================= */

async function copyShareText(
    text
) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        await navigator.clipboard.writeText(
            text
        );

        return;
    }


    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";

    textarea.style.opacity =
        "0";


    document.body.appendChild(
        textarea
    );


    textarea.focus();

    textarea.select();


    document.execCommand(
        "copy"
    );


    textarea.remove();
}


/* =========================================================
   SHARE RESULT
   ========================================================= */

async function shareDailyResult() {

    const shareText =
        getDailyShareText();


    if (
        !shareText
    ) {
        return;
    }


    /*
       IMPORTANT:

       Send the entire result as TEXT.

       Do not pass "url" separately because some
       browsers/share targets will prioritize the URL
       and discard the rest of the result.
    */

    if (
        navigator.share
    ) {

        try {

            await navigator.share({

                text:
                    shareText

            });


            return;

        } catch (error) {

            /*
               User simply closed
               the share dialog.
            */

            if (
                error.name ===
                "AbortError"
            ) {

                return;
            }


            console.error(
                "Native sharing failed:",
                error
            );
        }
    }


    /*
       FALLBACK:
       Copy the complete result.
    */

    try {

        await copyShareText(
            shareText
        );


        if (
            shareResultButton
        ) {

            const originalText =
                shareResultButton
                    .textContent;


            shareResultButton.textContent =
                "Copied!";


            setTimeout(
                () => {

                    shareResultButton.textContent =
                        originalText;

                },
                1500
            );
        }

    } catch (error) {

        console.error(
            "Unable to share result:",
            error
        );
    }
}


/* STATISTICS */

function createFreshStats() {

    return {

        gamesPlayed:
            0,

        gamesWon:
            0,

        currentStreak:
            0,

        bestStreak:
            0,

        totalWinningGuesses:
            0,

        guessDistribution: {

            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        },

        lastWinDate:
            null
    };
}


/* GET STATISTICS */

function getStats() {

    try {

        const stored =
            localStorage.getItem(
                STATS_STORAGE_KEY
            );


        if (!stored) {

            return createFreshStats();
        }


        const parsed =
            JSON.parse(
                stored
            );


        const stats =
            createFreshStats();


        stats.gamesPlayed =
            Math.max(
                0,
                Number(parsed.gamesPlayed) || 0
            );


        stats.gamesWon =
            Math.max(
                0,
                Number(parsed.gamesWon) || 0
            );


        stats.currentStreak =
            Math.max(
                0,
                Number(parsed.currentStreak) || 0
            );


        stats.bestStreak =
            Math.max(
                0,
                Number(parsed.bestStreak) || 0
            );


        stats.totalWinningGuesses =
            Math.max(
                0,
                Number(parsed.totalWinningGuesses) || 0
            );


        stats.guessDistribution = {

            1:
                Math.max(
                    0,
                    Number(
                        parsed.guessDistribution?.[1]
                    ) || 0
                ),

            2:
                Math.max(
                    0,
                    Number(
                        parsed.guessDistribution?.[2]
                    ) || 0
                ),

            3:
                Math.max(
                    0,
                    Number(
                        parsed.guessDistribution?.[3]
                    ) || 0
                ),

            4:
                Math.max(
                    0,
                    Number(
                        parsed.guessDistribution?.[4]
                    ) || 0
                ),

            5:
                Math.max(
                    0,
                    Number(
                        parsed.guessDistribution?.[5]
                    ) || 0
                )
        };


        stats.lastWinDate =
            typeof parsed.lastWinDate === "string"
                ? parsed.lastWinDate
                : null;


        return stats;

    } catch (error) {

        console.error(
            "Unable to load statistics:",
            error
        );


        return createFreshStats();
    }
}


/* SAVE STATISTICS */

function saveStats(
    stats
) {

    localStorage.setItem(
        STATS_STORAGE_KEY,
        JSON.stringify(
            stats
        )
    );
}


/* RECORD GAME RESULT */

function recordGameResult(
    won,
    guesses
) {

    if (resultRecorded) {
        return;
    }


    resultRecorded = true;


    const stats =
        getStats();


    const today =
        getCurrentDailyDate();

    stats.gamesPlayed++;


    /*
       WIN
    */

    if (won) {

        stats.gamesWon++;

        stats.totalWinningGuesses +=
            guesses;


        if (
            guesses >= 1 &&
            guesses <= 5
        ) {

            stats.guessDistribution[
                guesses
            ]++;
        }

        if (
            stats.lastWinDate === null
        ) {

            stats.currentStreak = 1;

        } else {

            const daysSinceLastWin =
                getDateDifferenceInDays(
                    stats.lastWinDate,
                    today
                );


            if (
                daysSinceLastWin === 1
            ) {

                stats.currentStreak++;

            } else if (
                daysSinceLastWin === 0
            ) {
                stats.currentStreak =
                    Math.max(
                        stats.currentStreak,
                        1
                    );

            } else {

                stats.currentStreak = 1;
            }
        }


        /*
           Update best streak.
        */

        if (
            stats.currentStreak >
            stats.bestStreak
        ) {

            stats.bestStreak =
                stats.currentStreak;
        }


        /*
           Store today's win date.
        */

        stats.lastWinDate =
            today;

    }

    else {

        stats.currentStreak = 0;
    }

    saveStats(
        stats
    );
}


/* WIN PERCENTAGE */

function getWinPercentage(
    stats
) {

    if (
        stats.gamesPlayed <= 0
    ) {

        return 0;
    }


    const percentage =

        (
            stats.gamesWon /
            stats.gamesPlayed
        ) * 100;


    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                percentage
            )
        )
    );
}


/* AVERAGE GUESSES */

function getAverageGuesses(
    stats
) {

    if (
        stats.gamesWon <= 0
    ) {

        return null;
    }


    return (

        stats.totalWinningGuesses /
        stats.gamesWon

    ).toFixed(1);
}


/* STATISTICS MODAL ELEMENTS */

const statsModal =
    document.getElementById(
        "statsModal"
    );

const statsButton =
    document.getElementById(
        "statsButton"
    );

const closeStatsButton =
    document.getElementById(
        "closeStatsButton"
    );

const resetStatsButton =
    document.getElementById(
        "resetStatsButton"
    );
const shareResultButton =
    document.getElementById(
        "shareResultButton"
    );    



/* HOW TO PLAY MODAL ELEMENTS */

const howToPlayModal =
    document.getElementById(
        "howToPlayModal"
    );

const howToPlayButton =
    document.getElementById(
        "howToPlayButton"
    );

const closeHowToPlayButton =
    document.getElementById(
        "closeHowToPlayButton"
    );


/* OPEN HOW TO PLAY */

function openHowToPlayModal() {

    if (!howToPlayModal) {
        return;
    }


    if (
        statsModal &&
        statsModal.classList.contains(
            "open"
        )
    ) {
        closeStatsModal();
    }


    howToPlayModal.classList.add(
        "open"
    );


    howToPlayModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    if (closeHowToPlayButton) {
        closeHowToPlayButton.focus();
    }
}


/* CLOSE HOW TO PLAY */

function closeHowToPlayModal() {

    if (!howToPlayModal) {
        return;
    }


    howToPlayModal.classList.remove(
        "open"
    );


    howToPlayModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    if (howToPlayButton) {
        howToPlayButton.focus();
    }
}


if (howToPlayButton) {

    howToPlayButton.addEventListener(
        "click",
        openHowToPlayModal
    );
}


if (closeHowToPlayButton) {

    closeHowToPlayButton.addEventListener(
        "click",
        closeHowToPlayModal
    );
}


if (howToPlayModal) {

    howToPlayModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                howToPlayModal
            ) {

                closeHowToPlayModal();
            }
        }
    );
}


/* UPDATE STATISTICS MODAL */

function updateStatsModal() {

    const stats =
        getStats();

    const winPercentage =
        getWinPercentage(
            stats
        );

    const averageGuesses =
        getAverageGuesses(
            stats
        );


    document.getElementById(
        "gamesPlayedStat"
    ).textContent =
        stats.gamesPlayed;


    document.getElementById(
        "gamesWonStat"
    ).textContent =
        stats.gamesWon;


    document.getElementById(
        "winPercentageStat"
    ).textContent =
        `${winPercentage}%`;


    document.getElementById(
        "currentStreakStat"
    ).textContent =
        stats.currentStreak;


    document.getElementById(
        "bestStreakStat"
    ).textContent =
        stats.bestStreak;


    document.getElementById(
        "averageGuessesStat"
    ).textContent =
        averageGuesses === null
            ? "—"
            : averageGuesses;


    /* GUESS DISTRIBUTION */

const distribution =
    stats.guessDistribution;


const highestCount =
    Math.max(

        distribution[1],
        distribution[2],
        distribution[3],
        distribution[4],
        distribution[5],

        1
    );


for (
    let guess = 1;
    guess <= 5;
    guess++
) {

    const count =
        distribution[guess];


    const percentage =
        count === 0
            ? 0
            : (
                count /
                highestCount
            ) * 100;


    const bar =
        document.getElementById(
            `distributionBar${guess}`
        );


    const countElement =
        document.getElementById(
            `distributionCount${guess}`
        );


    if (bar) {

        bar.style.width =
            `${percentage}%`;
    }


    if (countElement) {

        countElement.textContent =
            count;
    }
}
}


/* OPEN STATISTICS MODAL */

function openStatsModal() {

    if (!statsModal) {

        console.error(
            "statsModal element was not found."
        );

        return;
    }


    if (
        howToPlayModal &&
        howToPlayModal.classList.contains(
            "open"
        )
    ) {
        closeHowToPlayModal();
    }


    updateStatsModal();
    updateShareButton();


    statsModal.classList.add(
        "open"
    );


    statsModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    if (closeStatsButton) {
        closeStatsButton.focus();
    }
}


/* CLOSE STATISTICS MODAL */

function closeStatsModal() {

    if (!statsModal) {

        return;
    }


    statsModal.classList.remove(
        "open"
    );


    statsModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    if (statsButton) {
        statsButton.focus();
    }
}


/* STATISTICS BUTTON */

if (statsButton) {

    statsButton.addEventListener(
        "click",
        openStatsModal
    );
}


/* CLOSE STATISTICS */

if (closeStatsButton) {

    closeStatsButton.addEventListener(
        "click",
        closeStatsModal
    );
}


/* CLICK OUTSIDE MODAL */

if (statsModal) {

    statsModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                statsModal
            ) {

                closeStatsModal();
            }
        }
    );
}


/* ESCAPE KEY */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        if (
            howToPlayModal &&
            howToPlayModal.classList.contains(
                "open"
            )
        ) {

            closeHowToPlayModal();
            return;
        }


        if (
            statsModal &&
            statsModal.classList.contains(
                "open"
            )
        ) {

            closeStatsModal();
        }
    }
);


/* RESET STATISTICS */

if (resetStatsButton) {

    resetStatsButton.addEventListener(
        "click",
        () => {

            const confirmed =
                window.confirm(
                    "Reset all statistics? This cannot be undone."
                );


            if (!confirmed) {

                return;
            }


            localStorage.removeItem(
                STATS_STORAGE_KEY
            );

            resultRecorded = false;
            updateStatsModal();
        }
    );
}


/* SEEDED RANDOM */

function mulberry32(
    seed
) {

    return function () {

        let t =
            seed +=
            0x6D2B79F5;


        t =
            Math.imul(

                t ^ (t >>> 15),

                t | 1
            );


        t ^= t +

            Math.imul(

                t ^ (t >>> 7),

                t | 61
            );


        return (

            (t ^ (t >>> 14))
            >>> 0
        ) / 4294967296;
    };
}


/* DATE → SEED */

function getDailySeed(
    dateString = null
) {

    let year;
    let month;
    let day;


    if (dateString) {

        const parts =
            dateString.split("-");


        year =
            Number(parts[0]);

        month =
            Number(parts[1]);

        day =
            Number(parts[2]);

    } else {

        const now =
            new Date();


        year =
            now.getFullYear();

        month =
            now.getMonth() + 1;

        day =
            now.getDate();
    }


    return (

        year * 10000 +
        month * 100 +
        day
    );
}


/* RANDOM HELPER */

function randomBetween(
    random,
    min,
    max
) {

    return (

        min +
        random() *
        (max - min)
    );
}


/* DISTANCE */

function calculateDistance(
    pointA,
    pointB
) {

    const dx =
        pointB.x -
        pointA.x;

    const dy =
        pointB.y -
        pointA.y;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


/* PIXELS → CM */

function pixelsToCentimeters(
    pixels
) {

    return (
        pixels /
        GAME_CONFIG.pixelsPerCm
    );
}


/* ROUNDING */

function roundToOneDecimal(
    value
) {

    return (

        Math.round(
            value * 10
        ) / 10
    );
}


/* MIDPOINT */

function getMidpoint(
    pointA,
    pointB
) {

    return {

        x:
            (
                pointA.x +
                pointB.x
            ) / 2,

        y:
            (
                pointA.y +
                pointB.y
            ) / 2
    };
}


/* CENTER CHECK */

function isVisuallyCentered(
    pointA,
    pointB
) {

    const midpoint =
        getMidpoint(
            pointA,
            pointB
        );


    const center =
        BOARD_SIZE / 2;


    const distanceFromCenter =
        Math.sqrt(

            Math.pow(
                midpoint.x -
                center,
                2
            ) +

            Math.pow(
                midpoint.y -
                center,
                2
            )
        );


    return (

        distanceFromCenter <=
        GAME_CONFIG.centerTolerance
    );
}


/* EDGE CHECK */

function isAwayFromEdges(
    point
) {

    const margin =
        GAME_CONFIG.edgeMargin;


    return (

        point.x >= margin &&

        point.x <=
            BOARD_SIZE -
            margin &&

        point.y >= margin &&

        point.y <=
            BOARD_SIZE -
            margin
    );
}


/* ANGLE */

function getAngleDegrees(
    pointA,
    pointB
) {

    const dx =
        pointB.x -
        pointA.x;

    const dy =
        pointB.y -
        pointA.y;


    let angle =
        Math.atan2(
            dy,
            dx
        ) *
        180 /
        Math.PI;


    angle =
        Math.abs(
            angle
        );


    if (
        angle > 180
    ) {

        angle =
            360 -
            angle;
    }


    return angle;
}


/* ANGLE CHECK */

function hasGoodAngle(
    pointA,
    pointB
) {

    const angle =
        getAngleDegrees(
            pointA,
            pointB
        );


    const tolerance =
        GAME_CONFIG
            .axisToleranceDegrees;


    const horizontal =
        angle <= tolerance ||
        angle >=
            180 - tolerance;


    const vertical =
        Math.abs(
            angle - 90
        ) <= tolerance;


    return !(
        horizontal ||
        vertical
    );
}


/* GENERATE DAILY PUZZLE */

function generateDailyPuzzle(
    dateString = null
) {

    const seed =
        getDailySeed(
            dateString
        );


    const random =
        mulberry32(
            seed
        );


    const center =
        BOARD_SIZE / 2;


    for (
        let attempt = 0;
        attempt <
        GAME_CONFIG.maxGenerationAttempts;
        attempt++
    ) {

        const midpoint = {

            x:
                randomBetween(

                    random,

                    center -
                    GAME_CONFIG.centerTolerance,

                    center +
                    GAME_CONFIG.centerTolerance
                ),

            y:
                randomBetween(

                    random,

                    center -
                    GAME_CONFIG.centerTolerance,

                    center +
                    GAME_CONFIG.centerTolerance
                )
        };


        const distance =
            randomBetween(

                random,

                GAME_CONFIG.minDistance,

                GAME_CONFIG.maxDistance
            );


        const angle =
            randomBetween(

                random,

                0,

                Math.PI * 2
            );


        const halfDistance =
            distance / 2;


        const dx =
            Math.cos(angle) *
            halfDistance;


        const dy =
            Math.sin(angle) *
            halfDistance;


        const pointA = {

            x:
                midpoint.x -
                dx,

            y:
                midpoint.y -
                dy
        };


        const pointB = {

            x:
                midpoint.x +
                dx,

            y:
                midpoint.y +
                dy
        };


        if (
            !isAwayFromEdges(
                pointA
            ) ||
            !isAwayFromEdges(
                pointB
            )
        ) {

            continue;
        }


        if (
            !isVisuallyCentered(
                pointA,
                pointB
            )
        ) {

            continue;
        }


        if (
            !hasGoodAngle(
                pointA,
                pointB
            )
        ) {

            continue;
        }


        const actualDistance =
            calculateDistance(
                pointA,
                pointB
            );


        const distanceCm =
            roundToOneDecimal(

                pixelsToCentimeters(
                    actualDistance
                )
            );


        return {

            dateSeed:
                seed,

            pointA:
                pointA,

            pointB:
                pointB,

            pixelDistance:
                actualDistance,

            distanceCm:
                distanceCm,

            angle:
                getAngleDegrees(
                    pointA,
                    pointB
                )
        };
    }


    /*
       Fallback.
    */

    const fallbackA = {

        x: 95,

        y: 105
    };


    const fallbackB = {

        x: 205,

        y: 195
    };


    const fallbackDistance =
        calculateDistance(
            fallbackA,
            fallbackB
        );


    return {

        dateSeed:
            seed,

        pointA:
            fallbackA,

        pointB:
            fallbackB,

        pixelDistance:
            fallbackDistance,

        distanceCm:
            roundToOneDecimal(

                pixelsToCentimeters(
                    fallbackDistance
                )
            ),

        angle:
            getAngleDegrees(
                fallbackA,
                fallbackB
            )
    };
}


/* DRAW GAME */

function drawGame(
    puzzle
) {

    ctx.clearRect(

        0,
        0,
        BOARD_SIZE,
        BOARD_SIZE
    );


    drawPoint(
        puzzle.pointA,
        "A"
    );


    drawPoint(
        puzzle.pointB,
        "B"
    );
}


/* DRAW POINT */

function drawPoint(
    point,
    label
) {

    ctx.beginPath();


    ctx.arc(

        point.x,
        point.y,

        GAME_CONFIG.pointRadius,

        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        POINT_COLOR;


    ctx.fill();


    ctx.font =
        LABEL_FONT;


    ctx.fillStyle =
        LABEL_COLOR;


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "bottom";


    ctx.fillText(

        label,

        point.x,

        point.y - 12
    );
}


/* BOARD ANIMATION */

function animateBoard(
    animationClass
) {

    canvas.classList.remove(

        "shake",
        "success"
    );


    void canvas.offsetWidth;


    canvas.classList.add(
        animationClass
    );


    canvas.addEventListener(

        "animationend",

        () => {

            canvas.classList.remove(
                animationClass
            );

        },

        {
            once: true
        }
    );
}


/* TEMPERATURE */

function getTemperature(
    difference
) {

    if (
        difference <=
        GAME_CONFIG.correctTolerance
    ) {

        return {

            text:
                "CORRECT",

            className:
                "correct"
        };
    }


    if (
        difference <= 0.5
    ) {

        return {

            text:
                "ALMOST!",

            className:
                "almost"
        };
    }


    if (
        difference <= 1
    ) {

        return {

            text:
                "BOILING",

            className:
                "boiling"
        };
    }


    if (
        difference <= 2
    ) {

        return {

            text:
                "HOT",

            className:
                "hot"
        };
    }


    if (
        difference <= 4
    ) {

        return {

            text:
                "WARM",

            className:
                "warm"
        };
    }


    if (
        difference <= 6
    ) {

        return {

            text:
                "COOL",

            className:
                "cool"
        };
    }


    return {

        text:
            "COLD",

        className:
            "cold"
    };
}


/* GUESS DIRECTION */

function getGuessDirection(
    guess,
    answer
) {

    if (
        Math.abs(
            guess - answer
        ) <=
        GAME_CONFIG.correctTolerance
    ) {

        return "✓";
    }


    if (
        guess < answer
    ) {

        return "↑";
    }


    return "↓";
}


/* ADD GUESS ROW */

function addGuessRow(
    guess,
    direction,
    temperature
) {

    const history =
        document.getElementById(
            "guessHistory"
        );


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "guess-row";


    const value =
        document.createElement(
            "div"
        );


    value.className =
        "guess-value";


    value.textContent =
        `${guess.toFixed(1)} cm`;


    const directionElement =
        document.createElement(
            "div"
        );


    directionElement.className =
        "guess-direction";


    directionElement.textContent =
        direction;


    const temperatureElement =
        document.createElement(
            "div"
        );


    temperatureElement.className =
        `guess-temperature ${temperature.className}`;


    temperatureElement.textContent =
        temperature.text;


    row.appendChild(
        value
    );


    row.appendChild(
        directionElement
    );


    row.appendChild(
        temperatureElement
    );


    history.appendChild(
        row
    );
}


/* ATTEMPTS COUNTER */

function updateAttempts() {

    const attemptCount =
        document.getElementById(
            "attemptCount"
        );


    const remaining =
        GAME_CONFIG.maxAttempts -
        attemptsUsed;


    attemptCount.textContent =
        remaining;


    attemptCount.classList.remove(
        "pulse"
    );


    void attemptCount.offsetWidth;


    attemptCount.classList.add(
        "pulse"
    );
}


/* GAME RESULT */

function showGameResult(
    message,
    type
) {

    const result =
        document.getElementById(
            "gameResult"
        );


    result.textContent =
        message;


    result.className =
        `game-result ${type}`;
}


/* END GAME */

function endGame(
    won
) {

    if (gameOver) {

        return;
    }


    gameOver =
        true;

trackAnalytics(
    "game_completed",
    {
        result:
            won
                ? "won"
                : "lost",

        attempts:
            attemptsUsed
    }
);

    const input =
        document.getElementById(
            "guessInput"
        );


    const button =
        document.getElementById(
            "guessButton"
        );


    input.disabled =
        true;


    button.disabled =
        true;


    recordGameResult(

        won,

        attemptsUsed
    );

    markDailyPuzzleCompleted(
        getTodayLocalDate()
    );


    /*  WIN */

    if (won) {

        showGameResult(

            `CORRECT — You got it in ${attemptsUsed} ${
                attemptsUsed === 1
                    ? "guess"
                    : "guesses"
            }!`,

            "win"
        );


        animateBoard(
            "success"
        );

    }

    /*  LOSS */

    else {

        showGameResult(

            `OUT OF GUESSES — The answer was ${currentPuzzle.distanceCm.toFixed(1)} cm`,

            "lose"
        );
    }

    /*
   Create and store today's
   spoiler-free share result.
*/

const shareText =
    buildDailyShareText(
        won
    );


saveDailyShareText(
    shareText
);


updateShareButton();
    setTimeout(

        () => {

            openStatsModal();

        },

        1200
    );
}


/* PROCESS GUESS */

function processGuess() {

    if (gameOver) {

        return;
    }


    const input =
        document.getElementById(
            "guessInput"
        );


    const rawValue =
        input.value.trim();


     if (
        !/^(?:(?:[1-9]|1[0-4])(?:\.[0-9])?|15(?:\.0)?)$/.test(
            rawValue
        )
    ) {

        input.value =
            "";

        input.focus();

        return;
    }


    const guess =
        Number(
            rawValue
        );


    if (
        !Number.isFinite(
            guess
        )
    ) {

        input.value =
            "";

        input.focus();

        return;
    }


    if (
        guess < 1 ||
    guess > 15
    ) {

        input.value =
            "";

        input.focus();

        return;
    }


    const roundedGuess =
        roundToOneDecimal(
            guess
        );

        if (
    roundedGuess < 1.0 ||
    roundedGuess > 15.0
) {

    input.value =
        "";

    input.focus();

    return;
}

if (attemptsUsed === 0) {

    trackAnalytics(
        "game_started"
    );
}
    const answer =
        currentPuzzle.distanceCm;


    const difference =
        Math.abs(

            roundedGuess -
            answer
        );


    const direction =
        getGuessDirection(

            roundedGuess,

            answer
        );


    const temperature =
        getTemperature(
            difference
        );


    attemptsUsed++;


    addGuessRow(

        roundedGuess,

        direction,

        temperature
    );


    updateAttempts();


    input.value =
        "";

    if (
        difference <=
        GAME_CONFIG.correctTolerance
    ) {

        endGame(
            true
        );

        return;
    }


    animateBoard(
        "shake"
    );

    if (
        attemptsUsed >=
        GAME_CONFIG.maxAttempts
    ) {

        endGame(
            false
        );

        return;
    }


    input.focus();
}


/* RESET GAME UI */

function resetGame(
    puzzle
) {

    currentPuzzle =
        puzzle;


    attemptsUsed =
        0;


    gameOver =
        false;


    resultRecorded =
        false;


    const history =
        document.getElementById(
            "guessHistory"
        );


    history.innerHTML =
        "";


    const result =
        document.getElementById(
            "gameResult"
        );


    result.textContent =
        "";


    result.className =
        "game-result";


    const input =
        document.getElementById(
            "guessInput"
        );


    const button =
        document.getElementById(
            "guessButton"
        );


    input.disabled =
        false;


    button.disabled =
        false;


    document.getElementById(
        "attemptCount"
    ).textContent =
        GAME_CONFIG.maxAttempts;


    document.getElementById(
        "attemptCount"
    ).classList.remove(
        "pulse"
    );


    input.value =
        "";


    drawGame(
        puzzle
    );

}


/* LOCK COMPLETED DAILY GAME */

function lockCompletedDailyGame() {

    gameOver =
        true;


    const input =
        document.getElementById(
            "guessInput"
        );


    const button =
        document.getElementById(
            "guessButton"
        );


    input.disabled =
        true;


    button.disabled =
        true;


    showGameResult(

        "TODAY'S PUZZLE IS COMPLETED",

        "win"
    );
}


/* GUESS BUTTON */

const guessButton =
    document.getElementById(
        "guessButton"
    );


if (guessButton) {

    guessButton.addEventListener(

        "click",

        processGuess
    );
}


/* ENTER KEY */

const guessInput =
    document.getElementById(
        "guessInput"
    );


if (guessInput) {

    guessInput.addEventListener(
    "input",
    () => {

        let value =
            guessInput.value;

        value =
            value.replace(
                /[^0-9.]/g,
                ""
            );

        const firstDot =
            value.indexOf(".");


        if (
            firstDot !== -1
        ) {

            value =
                value.substring(
                    0,
                    firstDot + 1
                ) +

                value
                    .substring(
                        firstDot + 1
                    )
                    .replace(
                        /\./g,
                        ""
                    );
        }

        if (
            firstDot !== -1
        ) {

            const decimalPart =
                value.substring(
                    firstDot + 1
                );


            value =
                value.substring(
                    0,
                    firstDot + 1
                ) +

                decimalPart.substring(
                    0,
                    1
                );
        }

        const numericValue =
            Number(value);


        if (
            Number.isFinite(
                numericValue
            ) &&
            numericValue > 15
        ) {

            value =
                value.substring(
                    0,
                    value.length - 1
                );
        }


        guessInput.value =
            value;
    }
    );
}


if (guessInput) {

    guessInput.addEventListener(

        "keydown",

        (event) => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                processGuess();
            }
        }
    );
}

/* =========================================================
   SHARE RESULT BUTTON
   ========================================================= */

if (
    shareResultButton
) {

    shareResultButton.addEventListener(

        "click",

        shareDailyResult
    );
}

if (shareResultButton) {

    shareResultButton.addEventListener(
        "click",
        () => {

            if (
                !shareResultButton.disabled
            ) {

                trackAnalytics(
                    "share_clicked"
                );
            }
        }
    );
}


/* INITIALIZE GAME */

function initializeGame() {

    refreshCurrentStreak();

    const puzzle =
        generateDailyPuzzle();


    resetGame(
        puzzle
    );

    if (
        isDailyPuzzleCompleted()
    ) {

        lockCompletedDailyGame();
        openStatsModal();

        return;
    }

    guessInput.disabled =
        false;


    guessButton.disabled =
        false;
    guessInput.focus();
}

/* START */

initializeGame();