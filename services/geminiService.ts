
import { GoogleGenAI } from "@google/genai";
import { DonationRecord } from "../types";

export const generateDonationInsight = async (donations: DonationRecord[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalVolume = donations.reduce((acc, curr) => acc + curr.units, 0);
  const byGroup = donations.reduce((acc, curr) => {
    acc[curr.userBloodGroup] = (acc[curr.userBloodGroup] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = `
    Total Donations: ${donations.length}
    Total Volume: ${totalVolume}ml
    Breakdown by Group: ${JSON.stringify(byGroup)}
    Date: ${new Date().toLocaleDateString()}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a medical data analyst. Analyze this blood bank data and provide 3 short, actionable bullet points about current stock levels and donor engagement.
      
      Data:
      ${summary}`,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI insights at this time.";
  }
};
