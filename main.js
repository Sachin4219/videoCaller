let localStream;
let remoteStream;
let peerConnection;
let App_id = "464529792cef4caebaf11147a252398d";

let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if(!roomId){
    window.location = "lobby.html"
}

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let init = async () => {
    client = await AgoraRTM.createInstance(App_id)
    await client.login({uid, token})

    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft',handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true})
    document.getElementById('user1').srcObject = localStream
}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }


}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}
let handleUserLeft = async (MemberId) => {
    console.log('A user left the channel:', MemberId)
    document.getElementById('user2').style.display="none"
}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user2').srcObject = remoteStream
    document.getElementById('user2').style.display="block"

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user1').srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, MemberId)
}


let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}


let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async ()=>{
    let videoTrack = localStream.getTracks().find(track=> track.kind === 'video')
    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('cameraBtn').style.backgroundColor = 'rgb(255,80,80)'
    }
    else{
        videoTrack.enabled = true
        document.getElementById('cameraBtn').style.backgroundColor = 'rgba(179,102,249,0.9)'
    }
}

let toggleMic = async ()=>{
    let audioTrack = localStream.getTracks().find(track=> track.kind === 'audio')
    if(!audioTrack)
        document.getElementById('micBtn').style.backgroundColor = 'rgb(255,80,80)'

    else if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('micBtn').style.backgroundColor = 'rgb(255,80,80)'
    }
    else{
        audioTrack.enabled = true
        document.getElementById('micBtn').style.backgroundColor = 'rgba(179,102,249,0.9)'
    }
}

window.addEventListener('beforeunload', leaveChannel)
document.getElementById('cameraBtn').addEventListener('click', toggleCamera)
document.getElementById('micBtn').addEventListener('click', toggleMic)
document.getElementById('leaveBtn').addEventListener('click', leaveChannel)

init()
