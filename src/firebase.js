const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxSGoJJzgTeO33-en4V2vuCWyb2EACawE",
  authDomain: "daylist-1c865.firebaseapp.com",
  projectId: "daylist-1c865",
  storageBucket: "daylist-1c865.firebasestorage.app",
  messagingSenderId: "921812655922",
  appId: "1:921812655922:web:9d085875910db721bc812b",
  measurementId: "G-JN6PFGFVBF"
};

let instance;
export async function firebase(){
  if(instance) return instance;
  let config;
  try {
    const res = await fetch('/api/config');
    if(res.ok){
      const data = await res.json();
      config = data.firebase;
    }
  } catch {
    config = null;
  }
  
  const finalConfig = config || DEFAULT_FIREBASE_CONFIG;
  if(!finalConfig?.apiKey) throw Error('FIREBASE_NOT_CONFIGURED');

  const [{initializeApp}, authModule, firestoreModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
  ]);
  const app = initializeApp(finalConfig);
  const auth = authModule.getAuth(app);
  const db = firestoreModule.getFirestore(app);
  auth.languageCode = 'es';
  instance = { app, auth, db, ...authModule, ...firestoreModule };
  return instance;
}


export async function signIn(email,password){
  const f = await firebase();
  return f.signInWithEmailAndPassword(f.auth,email,password);
}

export async function register(email,password,name){
  const f = await firebase();
  const {user} = await f.createUserWithEmailAndPassword(f.auth,email,password);
  await f.updateProfile(user,{displayName:name});
  await f.sendEmailVerification(user);
  return user;
}

export async function recover(email){
  const f = await firebase();
  await f.sendPasswordResetEmail(f.auth,email);
}

export async function signOut(){
  const f = await firebase();
  await f.signOut(f.auth);
}

export async function signInWithGoogle(){
  const f = await firebase();
  const provider = new f.GoogleAuthProvider();
  return f.signInWithPopup(f.auth, provider);
}

export async function saveSharedList(list, members = []){
  const f = await firebase();
  if(!f.auth.currentUser) throw Error('AUTH_REQUIRED');
  const listRef = f.doc(f.db, 'lists', list.id);
  const payload = {
    ...list,
    ownerId: f.auth.currentUser.uid,
    ownerEmail: f.auth.currentUser.email,
    members: Array.from(new Set([...members, f.auth.currentUser.email])),
    updatedAt: new Date().toISOString()
  };
  await f.setDoc(listRef, payload, { merge: true });
  return payload;
}

export async function loadUserSharedLists(){
  const f = await firebase();
  if(!f.auth.currentUser) return [];
  const q = f.query(
    f.collection(f.db, 'lists'),
    f.where('members', 'array-contains', f.auth.currentUser.email)
  );
  const snapshot = await f.getDocs(q);
  const lists = [];
  snapshot.forEach(doc => lists.push(doc.data()));
  return lists;
}

export async function getSharedList(listId){
  const f = await firebase();
  const listRef = f.doc(f.db, 'lists', listId);
  const snap = await f.getDoc(listRef);
  if(!snap.exists()) return null;
  return snap.data();
}

export async function joinSharedList(listId){
  const f = await firebase();
  if(!f.auth.currentUser) throw Error('AUTH_REQUIRED');
  const listRef = f.doc(f.db, 'lists', listId);
  const snapBefore = await f.getDoc(listRef);
  if(!snapBefore.exists()) return null;
  await f.setDoc(listRef, {
    members: f.arrayUnion(f.auth.currentUser.email),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  const snapAfter = await f.getDoc(listRef);
  return snapAfter.data();
}

export async function subscribeToSharedLists(onListsUpdate){
  const f = await firebase();
  if(!f.auth.currentUser) return () => {};
  const q = f.query(
    f.collection(f.db, 'lists'),
    f.where('members', 'array-contains', f.auth.currentUser.email)
  );
  return f.onSnapshot(q, (snapshot) => {
    const lists = [];
    snapshot.forEach(doc => lists.push(doc.data()));
    onListsUpdate(lists);
  }, (err) => {
    console.warn('Firestore snapshot error:', err);
  });
}

export function getCurrentUser(){
  return instance?.auth?.currentUser || null;
}

export const authMessage = e => ({
  'FIREBASE_NOT_CONFIGURED': 'Para guardar en la nube y compartir con otras personas, es necesario conectar tu proyecto de Firebase en la configuración.',
  'AUTH_REQUIRED': 'Debes iniciar sesión con tu cuenta para compartir y guardar listas en la nube.',
  'auth/invalid-credential': 'El correo o la contraseña no coinciden. Por favor revisa tus datos.',
  'auth/email-already-in-use': 'Este correo ya tiene una cuenta registrada. Inicia sesión o restablece tu contraseña.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Muchos intentos fallidos. Espera un momento antes de volver a intentarlo.',
  'auth/network-request-failed': 'Sin conexión a internet. Inténtalo de nuevo cuando estés en línea.'
}[e?.code || e?.message] || 'Ocurrió un inconveniente al procesar tu solicitud. Tus listas locales se conservan intactas.');

