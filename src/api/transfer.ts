import axios from "axios";
import { ApiResponse } from "../types/api";
import { api } from ".";

/**
 * Send funds to an email address
 * @param token Access token
 * @param recipientEmail Recipient email address
 * @param amount Amount to send
 * @param message Optional message
 * @returns Response from API
 */
export async function sendToEmail(
  token: string,
  recipientEmail: string,
  amount: number,
  message?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await api.post(
      "/api/transfers/send",
      {
        recipient: recipientEmail,
        amount,
        message: message || "",
        currency: "USDC",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Email transfer error:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to send funds",
      };
    }

    console.error("Unknown email transfer error:", error);
    return {
      success: false,
      error: "Unknown error occurred while sending funds",
    };
  }
}

/**
 * Send funds to an external wallet address
 * @param token Access token
 * @param walletAddress Recipient wallet address
 * @param amount Amount to send
 * @param network Blockchain network
 * @returns Response from API
 */
export async function sendToWallet(
  token: string,
  walletAddress: string,
  amount: number,
  network: string
): Promise<ApiResponse<any>> {
  try {
    const response = await api.post(
      "/api/transfers/wallet-withdraw",
      {
        toAddress: walletAddress,
        amount,
        currency: "USDC",
        network,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Wallet transfer error:", error.response?.data);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to send funds to wallet",
      };
    }

    console.error("Unknown wallet transfer error:", error);
    return {
      success: false,
      error: "Unknown error occurred while sending funds to wallet",
    };
  }
}

/**
 * Withdraw funds to a bank account
 * @param token Access token
 * @param amount Amount to withdraw
 * @param bankDetails Bank account details
 * @returns Response from API
 */
export async function withdrawToBank(
  token: string,
  amount: number,
  bankDetails: any
): Promise<ApiResponse<any>> {
  try {
    const response = await api.post(
      "/api/transfers/offramp",
      {
        amount,
        currency: "USDC",
        ...bankDetails,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Bank withdrawal error:", error.response?.data);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to withdraw funds to bank",
      };
    }

    console.error("Unknown bank withdrawal error:", error);
    return {
      success: false,
      error: "Unknown error occurred while withdrawing funds to bank",
    };
  }
}

/**
 * Get transfer history
 * @param token Access token
 * @param page Page number
 * @param limit Limit per page
 * @returns Transfer history
 */
export async function getTransferHistory(
  token: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<any>> {
  try {
    const response = await api.get(
      `/api/transfers?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Transfer history error:", error.response?.data);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to fetch transfer history",
      };
    }

    console.error("Unknown transfer history error:", error);
    return {
      success: false,
      error: "Unknown error occurred while fetching transfer history",
    };
  }
}
