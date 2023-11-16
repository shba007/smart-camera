import './index.css'

const videoContainer = document.getElementById("video-container")
const video = document.getElementById("video") as HTMLVideoElement
const startBtn = document.getElementById("start-btn")
const modelStatus = document.getElementById("model-status")
const infoCamera = document.getElementById("info-camera")
const infoObject = document.getElementById("info-object")
let model: any = null;
const camera = {
	width: 0,
	height: 0
}
const container = {
	width: videoContainer?.clientWidth ?? 0,
	height: videoContainer?.clientHeight ?? 0
}

// Check webcam support
function getUserMediaSupport() {
	return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function modelInit() {
	// @ts-ignore
	model = await cocoSsd.load()
	modelStatus!.innerText = "Model Loaded";
	modelStatus?.classList.replace("bg-yellow-500", "bg-green-600")
}

const children: any[] = []

async function predict() {
	for (let child of children)
		videoContainer?.removeChild(child);
	children.splice(0);
	infoObject!.innerHTML = ""

	const predictions = await model.detect(video)

	for (const prediction of predictions) {
		const { bbox, class: objectName, score: confidence } = prediction

		if (confidence < 0.66)
			continue

		const [x, y, width, height] = bbox

		const highlight = document.createElement('div')
		highlight.className = 'absolute bg-blue-500/20 rounded-md z-10 border'
		highlight.style.left = (x / camera.width) * container.width + "px"
		highlight.style.top = (y / camera.height) * container.height + "px"
		highlight.style.width = (width / camera.width) * container.width + "px"
		highlight.style.height = (height / camera.height) * container.height + "px"


		infoObject!.innerHTML += `
		<li>
			<span>${objectName}</span>
			<span>${Math.round(confidence * 100)} %</span>
			<ul>
				<li>X -> ${x}</li>
				<li>Y -> ${y}</li>
				<li>Width -> ${width}</li>
				<li>Height -> ${height}</li>
			</ul>
			<ul>
				<li>Transformed X -> ${(x / camera.width) * container.width}</li>
				<li>Transformed Y -> ${(y / camera.height) * container.height}</li>
				<li>Transformed Width -> ${(width / camera.width) * container.width}</li>
				<li>Transformed Height -> ${(height / camera.height) * container.height}</li>
			</ul>
		<li>
		`
		videoContainer?.appendChild(highlight)
		children.push(highlight)
	}

	window.requestAnimationFrame(predict)
}

async function enableCam() {
	if (getUserMediaSupport()) {
		const constrains = {
			video: true
		}

		const stream = await navigator.mediaDevices.getUserMedia(constrains)
		const track = stream.getVideoTracks()[0];
		const settings = track.getSettings();
		camera.width = settings.width ?? 0
		camera.height = settings.height ?? 0

		infoCamera!.innerHTML = `
		<ul>
			<li>Width -> ${camera.width}</li>
			<li>Height -> ${camera.height}</li>
		</ul>`

		video.srcObject = stream

		startBtn!.innerHTML = "Stop"
		startBtn?.classList.replace("bg-blue-500", "bg-red-500")
		// 
		video.addEventListener('loadeddata', predict)
	} else {
		alert("Your Device does't support Webcam")
	}
}

modelInit()

startBtn?.addEventListener('click', enableCam)