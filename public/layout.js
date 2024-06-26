$('#sidebarCollapse').on('click', function () {
    $('#sidebar').toggleClass('display');
});

$('#dismiss').on('click', function () {
    $('#sidebar').removeClass('display');

});

$('#main').on('click', function () {
    $('#sidebar').removeClass('display');
});

//search song
$("#search").on('click', function (e) {
  e.preventDefault();
  data = $("#search-keywords").val();
  window.location.href = "/search?data=" + encodeURIComponent(data);
});


var audio = document.getElementById("audio-player");

//play button
var playButton = document.getElementById("play-button");
playButton.addEventListener("click", function() {
  if (!audio.src) {
    return; // Ako nije postavljena pjesma, ne čini ništa
  }
  if (audio.paused) {
    audio.play();
    playButton.innerHTML = '<i class="bi bi-pause-circle"></i>'; // Promjena ikonice na pauzu
  } else {
    audio.pause();
    playButton.innerHTML = '<i class="bi bi-play-circle-fill"></i>'; // Promjena ikonice na reprodukciju
  }
});

//repeat button
var repeatButton = document.getElementById("repeat-button");
repeatButton.addEventListener("click", function() {
  if (!audio.src) {
    return; // Ako nije postavljena pjesma, ne čini ništa
  }
  audio.loop = !audio.loop;
  repeatButton.classList.toggle("active");
});


//progress bar
var progressBar = document.getElementById("progress-bar");
var progressBarContainer = document.querySelector(".progress-bar-container");

var timeDisplay = document.getElementById("time-display");
audio.addEventListener("timeupdate", function() {
  var currentTime = formatTime(audio.currentTime);
  var duration = formatTime(audio.duration);
  var timeString = currentTime + " / " + duration;
  timeDisplay.innerHTML = timeString;

  var progress = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = progress + "%";
});

progressBarContainer.addEventListener("click", function(event) {
  var containerWidth = progressBarContainer.offsetWidth;
  var clickPosition = event.clientX - progressBarContainer.getBoundingClientRect().left;
  var clickPercentage = (clickPosition / containerWidth) * 100;
  var seekTime = (clickPercentage / 100) * audio.duration;
  audio.currentTime = seekTime;
});

function formatTime(time) {
  var minutes = Math.floor(time / 60);
  var seconds = Math.floor(time % 60);
  return minutes + ":" + padNumber(seconds);
}

function padNumber(number) {
  return (number < 10 ? "0" : "") + number;
}


//volume-slider
var volumeSlider = document.getElementById("volume-slider");
volumeSlider.addEventListener("input", function() {
  audio.volume = volumeSlider.value;
});


// previous & next song
var previousButton = document.getElementById("previous-button");
var nextButton = document.getElementById("next-button");

previousButton.addEventListener("click", playPreviousSong);
nextButton.addEventListener("click", playNextSong);

function getCurrentSongIndex() {
  var currentSongIndex = -1;
  for (var i = 0; i < songElements.length; i++) {
    if (songElements[i].getAttribute('data-preview-url') === audioPlayer.src) {
      currentSongIndex = i;
      break;
    }
  }
  return currentSongIndex;
}

function playSongAtIndex(index) {
  var songElement = songElements[index];
  if (songElement) {
    var previewUrl = songElement.getAttribute('data-preview-url');
    audioPlayer.src = previewUrl;
    audioPlayer.play();
  }
}


// random button
var randomButton = document.getElementById("random-button");
var isRandomMode = false; // Variable to keep track of random mode

function getRandomSongIndex() {
  return Math.floor(Math.random() * songElements.length);
}

randomButton.addEventListener("click", function() {
  isRandomMode = !isRandomMode; // Toggle random mode
  if (isRandomMode) {
    randomButton.classList.add("active");
    if (!audio.src) {
      playRandomSong();
    }
  } else {
    randomButton.classList.remove("active");
  }
});

function playRandomSong() {
  var randomSongIndex = getRandomSongIndex();
  playSongAtIndex(randomSongIndex);
}

//update-ano kako bi se kada je random button uključen puštala random pjesma klikom na next
function playNextSong() {
  var currentSongIndex = getCurrentSongIndex();
  var nextSongIndex;
  if (isRandomMode) {
    nextSongIndex = getRandomSongIndex();
  } else {
    nextSongIndex = currentSongIndex + 1;
    if (nextSongIndex >= songElements.length) {
      nextSongIndex = 0;
    }
  }
  playSongAtIndex(nextSongIndex);
}

function playPreviousSong() {
  var currentSongIndex = getCurrentSongIndex();
  var previousSongIndex;
  if (isRandomMode) {
    previousSongIndex = getRandomSongIndex();
  } else{
    previousSongIndex = currentSongIndex - 1;
    if (previousSongIndex < 0) {
      previousSongIndex = songElements.length - 1;
    }
  }
  playSongAtIndex(previousSongIndex);
}

audio.addEventListener("ended", function() {
  //puštanje random pjesme kada prethodna završi
  if (isRandomMode) {
    playNextSong();
  }
});

