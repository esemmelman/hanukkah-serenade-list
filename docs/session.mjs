export const STORAGE_KEY='hanukkah-serenade-session.v1';
export function readSession(storage,now=Date.now()){
  try{
    const saved=JSON.parse(storage.getItem(STORAGE_KEY));
    if(saved&&typeof saved.token==='string'&&Number.isSafeInteger(saved.expiresAt)&&saved.expiresAt>now)return saved;
    storage.removeItem(STORAGE_KEY);
  }catch{/* Private or blocked storage: continue with in-memory authentication. */}
  return null;
}
export function saveSession(storage,session){try{storage.setItem(STORAGE_KEY,JSON.stringify(session));}catch{}}
export function clearSession(storage){try{storage.removeItem(STORAGE_KEY);}catch{}}
