import './style.css'
import { v4 as uuid } from 'uuid'
import { app, auth, storage, db } from './firebase-config.js'
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDocs, getDoc, updateDoc, collection, query, where, serverTimestamp, onSnapshot, arrayUnion } from 'firebase/firestore'

const content = document.getElementById('content')
let user = ''
let selectedUser = ''

let setError = (parentElement, id) => {
	if (parentElement.querySelector(`#${id}`)) {
		return
	}
	else {
		let span = document.createElement('span')
		span.id = id
		span.textContent = 'Something went wrong.'
		parentElement.appendChild(span)
	}
}

let loadHTML = (url, callback) => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.onreadystatechange = () => {
	if (xhr.readyState === 4 && xhr.status === 200) {
		callback(xhr.responseText)
		console.log(xhr.responseText)
		window.history.pushState(null, '', url == 'home.html' ? '/' : url.slice(0, -5))
	}
  }
  xhr.send()
}

let updateUserStatus = new Promise(resolve => {
	onAuthStateChanged(auth, (user) => {
		resolve()
	})
})

let getCombinedId = (userId) => {
	return auth.currentUser.uid > userId 
		? auth.currentUser.uid + userId 
		: userId + auth.currentUser.uid
}

let extractFromString = (inputString, searchTerm) => {
    const index = inputString.indexOf(searchTerm)
    if (index !== -1) {
        const startIndex = index + searchTerm.length
        return inputString.slice(startIndex)
    }
    return null
}

let getHomePageContents = async (content, html) => {
	if (auth.currentUser !== null) { // If user is authenticated and logged in
		content.innerHTML = html
		
		content.querySelector('.user').innerHTML = `
			<img src="${auth.currentUser.photoURL}" alt="">
			<span>${auth.currentUser.displayName}</span>
			<button id="logout">Logout</button>
		`
		
		
		// Get documents (https://firebase.google.com/docs/firestore/query-data/get-data#web-modular-api_2)
		let userChats = await getDoc(doc(db, 'userChats', auth.currentUser.uid))

		if (userChats.exists()) { // Load users
			Object.entries(userChats.data()).sort((a, b) => b[1].date - a[1].date).forEach(chat => {
				let userChatDiv = document.createElement('div')
				userChatDiv.className = 'user-chat'
				userChatDiv.setAttribute('key', chat[1].userInfo.uid)
				
				userChatDiv.innerHTML = `
					<img src=${chat[1].userInfo.photoURL} alt="">
					<div class="user-chat-info">
						<span>${chat[1].userInfo.displayName}</span>
						<p>${chat[1].lastMessage?.text ? chat[1].lastMessage?.text : ''}</p>
					</div>
				`
				content.querySelector('.chats').appendChild(userChatDiv) 
			})
		} else {
			console.log("No such document!")
		}

		

		return content.innerHTML
	} 
	
	else {
		return html
	}
}


let updateContent = (route) => {
	return new Promise(async (resolve, reject) => {
		content.innerHTML = ''
		// the content is the div that has nothing inside of it
		// then this following code is supposed to load the register contents
		updateUserStatus.then(() => {			
			switch (route) {
				case '/':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'register'}.html`, async (html) => {
						content.innerHTML = await getHomePageContents(content, html)
						resolve()
					})
					
					break
	
				case '/login':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'login'}.html`, async (html) => {
						content.innerHTML = await getHomePageContents(content, html)
						resolve()
					})
					break
	
				case '/register':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'register'}.html`, async (html) => {
						content.innerHTML = await getHomePageContents(content, html)
						resolve()
					})
					break
	
				default:
					content.innerHTML = '404 Page not found'
					reject('404 Page not found')
			}
			
		})
	})
}

// 

let handleNavigation = () => {
	return new Promise(async resolve => {
		const route = window.location.pathname
		
		await updateContent(route)
		
		resolve()
	})
}	

// Add event listeners
window.addEventListener('popstate', handleNavigation)


;(async () => {
	// Initial page load
	await handleNavigation()

	
	if (window.location.pathname == '/') {
		const searchDiv = document.querySelector('.search')

		let uploadMessage = async (e) => {
			const textInput = document.querySelector('.chat-input input[type="text"]')
			const file = document.querySelector('.send input[type="file"]')
			const combinedId = getCombinedId(selectedUser.userInfo.uid)

			// Upload user input to the chat collection in Firestore
			const storageRef = ref(storage, uuid())
			const uploadTask = uploadBytesResumable(storageRef, file.files[0])
			uploadTask.on('state_changed',	
					() => {
						getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
							await updateDoc(doc(db, 'chats', combinedId), {
								messages: arrayUnion({
									id: uuid(),
									text: textInput.value,
									senderId: auth.currentUser.uid,
									date: Date.now(),
									image: downloadURL
								})
							})
						}).catch(error => {
							console.error(error)
						})						
					},
					(error) => {
						console.log('Upload error:', error)
					}
				)

			await updateDoc(doc(db, 'userChats', auth.currentUser.uid), {
				[combinedId + '.lastMessage']: {
					text: textInput.value,
				},
				[combinedId + '.date']: serverTimestamp()
			})

			await updateDoc(doc(db, 'userChats', selectedUser.userInfo.uid), {
				[combinedId + '.lastMessage']: {
					text: textInput.value,
				},
				[combinedId + '.date']: serverTimestamp()
				})
		}

		const unsubscribeFromLastMessage = onSnapshot(collection(db, 'userChats'), (snapshot) => {
			// Loop through all contents and change them accordingly
			snapshot.docChanges().forEach(change => {

				const data = Object.entries(change.doc.data())[0]
				const combinedId = data[0]
				const userId = data[1].userInfo.uid

				console.log(data)

				if (combinedId == getCombinedId(userId)) {
					document.querySelector(`[key="${userId}"] p`).innerHTML = data[1].lastMessage.text // Updates the latest message (<p> tag) through doc.data()
				}	
			})
		})

		document.getElementById('logout').addEventListener('click', (e) => {
			auth.signOut().then(() => {
				console.log('Signed out successfully')
				updateContent('/login')
			}).catch((error) => {
				console.log('Error when signing out:', error)
			})
		})

		document.getElementById('search-input').addEventListener('keydown', async (e) => {
			if (e.code === 'Enter') {
				e.preventDefault()
				

				const q = query(collection(db, 'users'), where('displayName', '==', e.target.value))

				const querySnapshot = await getDocs(q)
			
				try { // If a user is found
					querySnapshot.forEach((doc) => {
						user = doc.data()

						let userChatDiv = document.createElement('div')
						userChatDiv.className = 'user-chat'
						userChatDiv.setAttribute('key', user.uid)
						userChatDiv.innerHTML = `
							<img src=${user.photoURL} alt="">
							<div class="user-chat-info">
								<span>${user.displayName}</span>
								<p></p>
							</div>
						`
						if (document.querySelector('.search .user-chat')) {
							// Change contents of user-chat
							document.querySelector('.search .user-chat').remove()
							document.querySelector('.search').appendChild(userChatDiv)
						} else {
							document.querySelector('.search').appendChild(userChatDiv)
						}
					})
				} catch (error) { // If a user is not found
					console.log(error)
				}
			}
		})

		searchDiv.addEventListener('click', async (e) => {
			
			if (e.target.closest('.search .user-chat')) {
				// Check whether the group (chat collection in firestore) exists, if not create a new a one
				const combinedId = getCombinedId(user.uid)
	
	
				try {
	
					const res = await getDoc(doc(db, 'chats', combinedId))
	
					if (!res.exists()) {
						// Create chat in chats collection
						await setDoc(doc(db, 'chats', combinedId), {messages: []})
	
						// Create user chats
						await updateDoc(doc(db, 'userChats', auth.currentUser.uid), {
							[combinedId + '.userInfo']: {
								uid: user.uid,
								displayName: user.displayName,
								photoURL: user.photoURL
							},
							[combinedId + '.date']: serverTimestamp()
						})
	
						await updateDoc(doc(db, 'userChats', user.uid), {
							[combinedId + '.userInfo']: {
								uid: auth.currentUser.uid,
								displayName: auth.currentUser.displayName,
								photoURL: auth.currentUser.photoURL
							},
							[combinedId + '.date']: serverTimestamp()
						})
					}
				} catch (error) {
					console.log(error)
				} 
	
				finally {
					document.querySelector('.chats').appendChild(document.querySelector('.search .user-chat')) // Move .user-chat search div to the .chats sidebar (friends list)
					document.getElementById('search-input').value = '' // Clear input text	
				}

				
				
				// const unsub = onSnapshot(doc(db, 'userChats', auth.currentUser.uid), (doc) => {

				// 	Object.entries(doc.data()).forEach((chat) => {

				// 		document.querySelector('.chats .user-chat').setAttribute('key', chat[0].uid) // not right one 
				// 		console.log()
				// 	})
				// })
			}
		})

		document.querySelector('.chats').addEventListener('click', async (e) => {
			
			let userChatsData = Object.entries((await getDoc(doc(db, 'userChats', auth.currentUser.uid))).data())

			userChatsData.sort((a, b) => b[1].date - a[1].date).forEach(chat => {

				
				if (e.target.closest(`[key="${chat[1].userInfo.uid}"]`)) {
					// If user has clicked on one of their users from their friends list
					selectedUser = chat[1]
					

					document.querySelector('.chat-info span').innerHTML = selectedUser.userInfo.displayName

					const unsubscribeFromChatMessages = onSnapshot(doc(db, 'chats', getCombinedId(selectedUser.userInfo.uid)), (doc) => {
						document.querySelector('.messages').innerHTML = '' // Clear all messages

						// Update HTML for chat messages
						
						doc.data().messages.forEach(message => {
							document.querySelector('.messages').innerHTML += `
							<div class="message ${message.senderId === auth.currentUser.uid && 'owner'}">
								<div class="message-info">
									<img src="${message.senderId === auth.currentUser.uid ? auth.currentUser.photoURL : selectedUser.userInfo.photoURL}" alt="">
									<span>just now</span>
								</div>
								<div class="message-content">
									<p>${message.text}</p>
									${message.image && `<img src="` + message.image + `" alt="">`}
								</div>
							</div>
							`
						})

						// Get the last child element (ignoring non-element nodes)
						let lastChildElement = null
						let currentNode = document.querySelector('.messages').lastChild

						while (currentNode !== null) {
							if (currentNode.nodeType === Node.ELEMENT_NODE) {
								lastChildElement = currentNode
								break
							}
							currentNode = currentNode.previousSibling
						}

						if (lastChildElement) {
							lastChildElement.scrollIntoView({ behavior: 'smooth' })
						} 
					})
					
				}
			})


			 
		})

		document.querySelector('.send button').addEventListener('click', (e) => {
			e.preventDefault()
			uploadMessage(e)
		})

		document.querySelector('.chat-input input').addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.keyCode === 13) {
				e.preventDefault()
				uploadMessage(e)
			}
		})

		
	}


	
	else if (window.location.pathname == '/register') {
		let registerForm = document.getElementById('register-form')
		console.assert(!registerForm)
	
		registerForm.addEventListener("submit", async (e) => {
			e.preventDefault(e)
			const displayName = e.target[0].value
			const email = e.target[1].value
			const password = e.target[2].value
			const file = e.target[3].files[0]
	
			try {
				// Create user AUTHENTICATION
				const res = await createUserWithEmailAndPassword(auth, email, password)
	
				// Create storange reference
				const storageRef = ref(storage, displayName)
	
				// STORAGE
				const uploadTask = uploadBytesResumable(storageRef, file)
	
				uploadTask.on('state_changed',
					(snapshot) => {
						// Handle the upload progress
						const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
						console.log(`Upload is ${progress}% complete`)
					},
	
					(error) => {
						console.log('Upload error:', error)
						setError(registerForm, 'register-error')
					},
					
					() => {
						getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
							// Update profile
							await updateProfile(res.user, {
								displayName,
								photoURL: downloadURL,
							})
			
							// Create user on firestore
							await setDoc(doc(db, 'users', res.user.uid), {
								uid: res.user.uid,
								displayName,
								email,
								photoURL: downloadURL,
							})
	
							// Create user chats on firestore
							await setDoc(doc(db, 'userChats', res.user.uid), {})
	
							// This code runs INSIDE of the asynchronous function (so that the page won't refresh mid-upload)
							updateContent('/')

						})
					}
				)
			}
			catch (error) {
				console.log(error)
				setError(registerForm, 'register-error')
			}
		})
	}

	else if (window.location.pathname == '/login') {
		let loginForm = document.getElementById('login-form')

		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault()
			const email = e.target[0].value
			const password = e.target[1].value

			console.log(email, password)
			
			try {
				await signInWithEmailAndPassword(auth, email, password)
				.then((userCredential) => {
					console.log('User is signed in successfully')
					updateContent('/')
				}).catch((error) => {
					console.log(error)
				})
				
			} catch (error) {
				setError(loginForm, 'login-error')
			}


		})
	}
	
})()





