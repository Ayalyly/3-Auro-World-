import { Firestore, doc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { SocialPost } from "../types";
import { sanitizePayload, compressBase64 } from "./utils";

export const saveSocialPosts = async (
    db: Firestore,
    worldId: string,
    charId: string,
    posts: SocialPost[],
    addToBatch: (ref: any, data: any) => Promise<void>
) => {
    const charDocRef = doc(db, "auro_worlds", worldId, "characters", charId);
    const socialPostsCollectionRef = collection(charDocRef, 'social_posts');
    
    // Save top 30 posts
    const postsToSave = posts.slice(0, 30);
    
    for (const post of postsToSave) {
        if (!post.id) continue;
        
        // Compress post image if present
        let processedPost = { ...post };
        if (processedPost.image && processedPost.image.startsWith("data:image")) {
            processedPost.image = await compressBase64(processedPost.image, 800, 0.7);
        }
        
        await addToBatch(doc(socialPostsCollectionRef, post.id), sanitizePayload(processedPost));
    }
};

export const loadSocialPosts = async (
    db: Firestore,
    worldId: string,
    charId: string,
    limitCount: number = 30
): Promise<SocialPost[]> => {
    const charRef = doc(db, "auro_worlds", worldId, "characters", charId);
    const socialPostsCollectionRef = collection(charRef, 'social_posts');
    try {
        const q = query(socialPostsCollectionRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const socialSnap = await getDocs(q);
        const loadedPosts: any[] = [];
        socialSnap.forEach(doc => {
            loadedPosts.push(doc.data());
        });
        return loadedPosts;
    } catch (e) {
        console.warn("Error loading social_posts collection:", e);
        return [];
    }
};
