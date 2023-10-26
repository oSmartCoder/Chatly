import './style.css'
import { app, auth, storage, db } from './firebase-config.js'
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDocs, getDoc, updateDoc, collection, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore'

const content = document.getElementById('content')
let user = ''

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

let getHomePageContents = (content, html) => {
	if (auth.currentUser == null) {
		return html
	} 
	
	else {
		content.innerHTML = html
		content.querySelector('.user').innerHTML = `
			<img src="${auth.currentUser.photoURL}" alt="">
			<span>${auth.currentUser.displayName}</span>
			<button id="logout">Logout</button>
		`
		return content.innerHTML
	}
}


let updateContent = (route) => {
	return new Promise(async (resolve, reject) => {
		content.innerHTML = ''
		updateUserStatus.then(() => {			
			switch (route) {
				case '/':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'register'}.html`, (html) => {
						content.innerHTML = getHomePageContents(content, html)
						resolve()
					})
					break
	
				case '/login':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'login'}.html`, (html) => {
						content.innerHTML = getHomePageContents(content, html)
						resolve()
					})
					break
	
				case '/register':
					loadHTML(`${(auth.currentUser !==  null) ? 'home' : 'register'}.html`, (html) => {
						content.innerHTML = getHomePageContents(content, html)
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
						user = doc.data() // make doc.data() a variable that can be used in getHomePageContents()
						// update the html here

						document.querySelector('.search .user-chat').innerHTML = `
							<img src=${user.photoURL} alt="">
							<div class="user-chat-info">
								<span>${user.displayName}</span>
								<p></p>
							</div>
						`
					})
				} catch (error) { // If a user is not found
					console.log(error)
				}
			}
		})

		document.querySelector('.search .user-chat').addEventListener('click', async (e) => {
			// Check whether the group (chat collection in firestore) exists, if not create a new a one

			const combinedId = auth.currentUser.uid > user.uid 
				? auth.currentUser.uid + user.uid 
				: user.uid + auth.currentUser.uid


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
				document.querySelector('.chats').appendChild(document.querySelector('.search .user-chat'))
				document.getElementById('search-input').value = ''

				let userChatsDiv = document.createElement('div')
				userChatsDiv.className = 'user-chat'
				document.querySelector('.search').appendChild(userChatsDiv)

			}
		})

		const unsub = onSnapshot(doc(db, 'userChats', auth.currentUser.uid), (doc) => {

			Object.entries(doc.data()).forEach((chat) => {
				// TODO: LOOP THROUGH EACH ONE AND ADD EACH COMPONENTS TO THE CHAT SIDEBAR.
				document.querySelector('.search .user-chat').id = chat[0]
				console.log(document)
			})
		})
		

	}



	
	else if (window.location.pathname == '/register') {
		let registerForm = document.getElementById('register-form')
	
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





