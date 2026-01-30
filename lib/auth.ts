import { getServerSession } from "next-auth";
import { authOptions } from "./auth-config";
import { getCollection } from "./mongodb";

/**
 * Check if the current user is authenticated and is a super admin
 * Use this for protecting admin dashboard routes
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return false;
    }

    // Check if user is a super admin in the database
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ email: session.user.email });

    return user?.superAdmin === true;
  } catch (error) {
    console.error("Error checking admin authentication:", error);
    return false;
  }
}

/**
 * Check if user is just authenticated (not necessarily admin)
 * Use this for future user-only features
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return !!session?.user?.email;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Check if the current user has dev privileges
 * Use this for dev/testing features like setting wallet balance
 */
export async function isDevUser(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return false;
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ email: session.user.email });

    return user?.isDev === true;
  } catch (error) {
    console.error("Error checking dev user:", error);
    return false;
  }
}

/**
 * Get the current user's session
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return null;
    }

    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ email: session.user.email });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
