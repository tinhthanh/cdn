let stream;
let interval;
document.addEventListener('vetgo-auth-face', (event) => {
  if (event.detail.actionType === "openCamera") {
    startCamera(event.detail.videoElement);
  }
  if (event.detail.actionType === "stopCamera") {
    stopCamera();
  }
  if (event.detail.actionType === "checkFace") {
    let storedData = event.detail.data.storedDescriptors;
    if (storedData && storedData.length > 0) {
      checkFace(event.detail.data.descriptor, storedData).then();
    }
  }
});
async function getCameraDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(device => device.kind === 'videoinput');

  const frontCameras = cameras.filter(camera => camera.label.includes('front'));
  const rearCameras = cameras.filter(camera => !camera.label.includes('front'));
console.log("devices", devices)
  console.log("cameras", cameras)
  return { cameras, frontCameras, rearCameras };
}
 function startCamera(video) {
  getCameraDevices().then(devices => {
    const frontCamera = devices.frontCameras[0];
    const camera = devices.cameras[0];
    try {
      const constraints = {
        video: {
          deviceId: { exact: frontCamera ? frontCamera.cameraId : camera.cameraId }
        }
      };
      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
          video.srcObject = mediaStream;
          stream = mediaStream; // Lưu trữ tham chiếu đến stream
        })
      }
      video.addEventListener('playing', () => {
        console.log('playing');
        // const canvas = document.querySelector('#myCanvas');
        // const displaySize = {
        //   width: video.videoWidth,
        //   height: video.videoHeight
        // }
        // lam gi do de dung stram
        interval = setInterval(async () => {
          await detectFace(video);
        },500)
      })
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
    // Ví dụ chọn camera trước
    //startCamera(frontCamera.deviceId);

    // Hoặc chọn camera sau
    //startCamera(rearCamera.deviceId);
  });


}
function stopCamera() {
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      track.stop(); // Dừng từng track trong stream
    });
    clearInterval(interval);
  }
}
async function detectFace(video) {
  //const canvas = document.getElementById('myCanvas');
  //const ctx = canvas.getContext('2d');
  // Xóa bất kỳ khung nào đã vẽ trước đó trên canvas
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();
  // canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  let result = null;
  if (detection) {
    result = {descriptor: detection.descriptor, expressions: detection.expressions} ;
    // // Vẽ khung xung quanh khuôn mặt nhận diện được
    // faceapi.matchDimensions(canvas, displaySize);
    // const resizedResult = faceapi.resizeResults(detection, displaySize);
    // faceapi.draw.drawDetections(canvas, resizedResult);
    // faceapi.draw.drawFaceLandmarks(canvas, resizedResult);
    // faceapi.draw.drawFaceExpressions(canvas, resizedResult);
    // const storedDescriptor = Object.values(a.descriptor);
    // const faceDescriptor = detection.descriptor;
    // const distance = faceapi.euclideanDistance(faceDescriptor, storedDescriptor);
    // const  expression = detection.expressions;
    // let emotion = 'Không xác định'; // Giả sử mặc định là không xác định
    // if (expression) {
    //   const maxValue = Math.max(...Object.values(expression));
    //   emotion = Object.keys(expression).find(key => expression[key] === maxValue);
    //   console.log(`Detected detectExpression: `, emotion);
    // }
    //
    // if (!await detectLiveness(detection)) {
    //   console.log(`Detected liveness: là ảnh khong thẻ chấm công`);
    // } else {
    //   if (distance < 0.4) { // Ngưỡng nhận diện
    //     console.log("Có khả năng các gương mặt giống nhau.");
    //   }else {
    //     console.log("Các gương mặt khác nhau.");
    //   }
    // }

    // Gửi dữ liệu lên server để chấm công
  }
  this.document.dispatchEvent(new CustomEvent('detection-face', { detail: { data: result } }));

}
async function compareFace(targetDescriptor, storedDescriptors) {
  // Map over storedDescriptors and create LabeledFaceDescriptors
  let labelStoredDescriptors = storedDescriptors.map(fd => {
    // Assuming fd.descriptors is an array of Float32Array
    return new faceapi.LabeledFaceDescriptors(
      fd.label,
      fd.descriptors.map(d => new Float32Array(d))
    );
  });
  const faceMatcher = new faceapi.FaceMatcher(labelStoredDescriptors, 0.4);
  return faceMatcher.findBestMatch(targetDescriptor);
  // const distanceList = storedDescriptors.map(descriptor => faceapi.euclideanDistance(targetDescriptor, descriptor));
  // return distanceList.filter(distance => distance < 0.35).length > 0;
}
async function checkFace(targetDescriptor, storedDescriptors) {
  const result = await compareFace(targetDescriptor, storedDescriptors);
  this.document.dispatchEvent(new CustomEvent('check-face', { detail: { data: result } }));
}
async function detectLiveness(detection) {
  const initialFace = detection.landmarks.getMouth().map(point => [point.x, point.y]).flat();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Chờ 2 giây để kiểm tra chuyển động
  const newDetection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

  if (newDetection) {
    const newFace = newDetection.landmarks.getMouth().map(point => [point.x, point.y]).flat();

    if (initialFace.length > 0 && newFace.length > 0 && initialFace.length === newFace.length) {
      const distance = faceapi.euclideanDistance(initialFace, newFace);
      console.log("distance", distance)
      if (distance > 0.05) { // Kiểm tra sự khác biệt trong chuyển động
        return true;
      }
    }
  } else
  return false;
}
async function detectExpression(detection) {
  const initialFace = detection.landmarks.getMouth().map(point => [point.x, point.y]).flat();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Chờ 2 giây để kiểm tra chuyển động
  const newDetection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor().withFaceExpressions();

  if (newDetection) {
    const newFace = newDetection.landmarks.getMouth().map(point => [point.x, point.y]).flat();

    if (initialFace.length > 0 && newFace.length > 0 && initialFace.length === newFace.length) {
      const distance = faceapi.euclideanDistance(initialFace, newFace);
      console.log("distance", distance)
      if (distance > 0.05) { // Kiểm tra sự khác biệt trong chuyển động
        return true;
      }
    }
  } else
    return false;
}
async function loadModels() {
  const MODEL_URL = '/assets/face/js/models';
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  console.log("load ko")
}
loadModels().then();
