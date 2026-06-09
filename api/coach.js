import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "POST만 가능합니다." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "GEMINI_API_KEY가 설정되지 않았습니다.",
      });
    }

    const gemini = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const {
      nickname,
      income,
      budget,
      savingGoal,
      totalExpense,
      expectedSaving,
      savingRate,
      budgetUsageRate,
      topCategory,
      topCategoryRate,
      categoryTotals,
      recommendedCards,
    } = req.body;

    const userName =
      nickname && nickname.trim() !== "" ? nickname.trim() : "사용자";

    const prompt = `
너는 친절한 금융 코치다.
첫 문장은 반드시 "${userName}님,"으로 시작해라.
마크다운 굵게 표시(** **)는 쓰지 마라.

[사용자 소비 데이터]
월 수입: ${income}원
월 예산: ${budget}원
저축 목표: ${savingGoal}원
총 소비액: ${totalExpense}원
예상 저축 가능 금액: ${expectedSaving}원
절약률: ${savingRate}%
예산 사용률: ${budgetUsageRate}%
최대 소비 카테고리: ${topCategory || "없음"} (${topCategoryRate || 0}%)

카테고리별 소비:
${JSON.stringify(categoryTotals, null, 2)}

추천 카드 후보:
${JSON.stringify(recommendedCards, null, 2)}

아래 형식으로 한국어로 간결하게 작성해줘.

📊 소비 분석
- 현재 소비 상태를 2문장으로 요약

💰 저축 목표 평가
- 저축 목표 달성 가능성을 1~2문장으로 평가

✅ 절약 팁
1. 바로 실천 가능한 절약 팁
2. 바로 실천 가능한 절약 팁

💳 카드 혜택 참고
- 소비패턴에 맞는 혜택 유형 안내
`;

    const result = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    let coachText = result.text || "AI 코칭 결과를 생성하지 못했습니다.";

    if (!coachText.startsWith(`${userName}님`)) {
      coachText = `${userName}님, ${coachText}`;
    }

    return res.status(200).json({ message: coachText });
  } catch (error) {
    console.error("Gemini error:", error);

    return res.status(500).json({
      message: error?.message || "Gemini 생성 실패",
    });
  }
}