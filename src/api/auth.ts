import axios from "axios";
import {
  ApiResponse,
  AuthenticateResponse,
  OtpRequestResponse,
} from "../types/api";
import { api } from ".";

/**
 * Request OTP for authentication
 * @param email User email
 * @returns OTP request response with email and session ID
 */
export async function requestOtp(
  email: string
): Promise<ApiResponse<OtpRequestResponse>> {
  try {
    const response = await api.post<OtpRequestResponse>(
      "/api/auth/email-otp/request",
      { email }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to request OTP",
      };
    }

    return {
      success: false,
      error: "Unknown error occurred while requesting OTP",
    };
  }
}

/**
 * Authenticate with OTP
 * @param email User email
 * @param otp One-time password
 * @param sid Session ID from OTP request
 * @returns Authentication response with access token and user data
 */
export async function authenticateOtp(
  email: string,
  otp: string,
  sid: string
): Promise<ApiResponse<AuthenticateResponse>> {
  try {
    const response = await api.post<AuthenticateResponse>(
      "/api/auth/email-otp/authenticate",
      {
        email,
        otp,
        sid,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to authenticate",
      };
    }

    return {
      success: false,
      error: "Unknown error occurred during authentication",
    };
  }
}

/**
 * Get user profile information
 * @param token Access token
 * @returns User profile data
 */
export async function getUserProfile(token: string): Promise<ApiResponse<any>> {
  try {
    const response = await api.get("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Profile fetch error:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch user profile",
      };
    }

    console.error("Unknown profile fetch error:", error);
    return {
      success: false,
      error: "Unknown error occurred while fetching user profile",
    };
  }
}
