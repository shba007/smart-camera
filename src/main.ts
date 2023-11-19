import '@tensorflow/tfjs-backend-webgpu';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs'

// import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';

import './index.css'

const videoContainer = document.getElementById("video-container")
const video = document.getElementById("video") as HTMLVideoElement
const actionBtn = document.getElementById("action-btn")
const modelBtn = document.getElementById("model")
const infoCamera = document.getElementById("camera-info")
// const objectsInfo = document.getElementById("objects-info")
const pointsInfo = document.getElementById("points-info")
const fpsElem = document.getElementById("fps")

// let modelObjectDetector: cocoSsd.ObjectDetection | null = null;
let modelPostDetector: poseDetection.PoseDetector | null = null;
const container = {
	width: videoContainer?.clientWidth ?? 0,
	height: videoContainer?.clientHeight ?? 0
}
const offset = {
	x: 0,//-30,
	y: 0//10
}
const camera = {
	width: 0,
	height: 0
}
/* const objects: {
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
}[] = [] */
const artifacts: { objectsHighlight: any[], objectsInfo: any[], pointsHighlight: any[], pointsInfo: any[] } =
	{ objectsHighlight: [], objectsInfo: [], pointsHighlight: [], pointsInfo: [] }
const fps: number[] = []

function roundOff(num: number, significance = 2) {
	return Math.round(num * (10 ** significance)) / (10 ** significance)
}
function runningAverage(nums: number[], newValue: number, bucketSize = 20) {
	if (nums.length >= bucketSize)
		nums.shift()

	nums.push(newValue)
	return nums.reduce((total, num) => total + num, 0) / nums.length
}

// Check webcam support
function getUserMediaSupport() {
	return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function modelInit() {
	await tf.ready();
	await tf.setBackend('webgpu')

	// modelObjectDetector = await cocoSsd.load();
	modelPostDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER });

	modelBtn?.classList.replace("bg-yellow-500", "bg-green-600")
}

/* function predictObjects(objectPredictions: cocoSsd.DetectedObject[]) {
	for (let artifact of artifacts.objectsHighlight)
		videoContainer?.removeChild(artifact);
	for (let artifact of artifacts.objectsInfo)
		objectsInfo?.removeChild(artifact);

	artifacts.objectsHighlight.splice(0);
	artifacts.objectsInfo.splice(0);

	for (const prediction of objectPredictions) {
		const { class: objectName, score: confidence, bbox: currBbox } = prediction

		if (confidence < 0.5)
			continue

		const [x, y, width, height] = currBbox
		const [Tx, Ty, Twidth, Theight] = [(x / camera.width) * container.width + offset.x, (y / camera.height) * container.height - offset.y, (width / camera.width) * container.width, (height / camera.height) * container.height]

		const objectHighlight = document.createElement('div')
		objectHighlight.className = 'absolute bg-blue-500/20 rounded-md z-10 border-2'
		objectHighlight.style.left = Tx + "px"
		objectHighlight.style.top = Ty + "px"
		objectHighlight.style.width = Twidth + "px"
		objectHighlight.style.height = Theight + "px"

		const objectInfo = document.createElement('li')
		objectInfo.className = 'flex flex-col gap-4 p-4 bg-slate-800 rounded-md transition-all'
		objectInfo.innerHTML = `
			<div id="${objectName}" class="flex gap-1 px-3 py-1 text-lg rounded-full capitalize bg-blue-500">
				<img src="/icons/${objectName}.svg" class="w-6">	
				<span>${objectName}</span>
			</div>
			<ul class="grid grid-rows-2 grid-cols-2">
				<li>X &nbsp; ${roundOff(Tx)}</li>
				<li>Y &nbsp; ${roundOff(Ty)}</li>
				<li>W &nbsp; ${roundOff(Twidth)}</li>
				<li>H &nbsp; ${roundOff(Theight)}</li>
			</ul>
		`

		videoContainer?.appendChild(objectHighlight)
		objectsInfo?.appendChild(objectInfo)

		artifacts.objectsHighlight.push(objectHighlight)
		artifacts.objectsInfo.push(objectInfo)
	}
} */

function predictPoses(posePredictions: poseDetection.Pose[]) {
	for (let artifact of artifacts.pointsHighlight)
		videoContainer?.removeChild(artifact);
	for (let artifact of artifacts.pointsInfo)
		pointsInfo?.removeChild(artifact);

	artifacts.pointsHighlight.splice(0);
	artifacts.pointsInfo.splice(0);

	for (const prediction of posePredictions) {
		for (const keypoint of prediction.keypoints) {
			const { name, score: confidence, x, y } = keypoint
			const pointName = name?.split("_").join("-")

			if (confidence && confidence < 0.5)
				continue

			const [Tx, Ty] = [(x / camera.width) * container.width + offset.x, (y / camera.height) * container.height - offset.y]

			const pointHighlight = document.createElement('div')
			pointHighlight.className = 'absolute bg-blue-500 rounded-full z-10 border-2 w-3 aspect-square'
			pointHighlight.style.left = Tx + "px"
			pointHighlight.style.top = Ty + "px"

			const pointInfo = document.createElement('li')
			pointInfo.className = 'flex flex-col gap-4 p-4 bg-slate-800 rounded-md transition-all'
			pointInfo.innerHTML = `
			<div class="flex gap-1 px-3 py-1 rounded-full bg-blue-500">
				<img src="/icons/${pointName}.svg" class="w-6">	
				<span class="text-lg capitalize">${pointName?.split("-").join(" ")}</span>
			</div>
			<ul class="grid grid-cols-2">
				<li>X &nbsp; ${roundOff(Tx)}</li>
				<li>Y &nbsp; ${roundOff(Ty)}</li>
			</ul>
		`

			videoContainer?.appendChild(pointHighlight)
			pointsInfo?.appendChild(pointInfo)

			artifacts.pointsHighlight.push(pointHighlight)
			artifacts.pointsInfo.push(pointInfo)
		}

	}
}

async function predict() {
	const start = performance.now()

	// const objectPredictions = await modelObjectDetector!.detect(video)
	const posePredictions = await modelPostDetector!.estimatePoses(video);

	// predictObjects(objectPredictions)
	predictPoses(posePredictions)

	const end = performance.now()
	fpsElem!.innerText = `${roundOff(runningAverage(fps, 1000 / (end - start)), 0)} FPS`

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

		infoCamera!.className = "flex flex-col gap-4 p-4 bg-slate-800 rounded-md"
		infoCamera!.innerHTML = `
		<ul>
			<li>Camera Width -> ${camera.width}</li>
			<li>Camera Height -> ${camera.height}</li>
		</ul>
		<ul>
			<li>Container Width -> ${container.width}</li>
			<li>Container Height -> ${container.height}</li>
		</ul>
		`
		video.srcObject = stream
		// @ts-ignore
		actionBtn!.children[0].src = "/icons/pause.svg"
		actionBtn?.classList.replace("bg-blue-500", "bg-red-500")

		video.addEventListener('loadeddata', predict)
	} else {
		alert("Your Device does't support Webcam")
	}
}

modelInit()

actionBtn?.addEventListener('click', enableCam)

window.addEventListener('resize', () => {
	container.width = videoContainer?.clientWidth ?? 0
	container.height = videoContainer?.clientHeight ?? 0
})