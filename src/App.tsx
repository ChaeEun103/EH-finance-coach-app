import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Expense = {
  id: number;
  category: string;
  amount: number;
  date: string;
};

type OcrResult = {
  date: string;
  category: string;
  amount: string;
};

type CardRecommendation = {
  name: string;
  type: string;
  benefit: string;
  reason: string;
};

const categories = ["식비", "쇼핑", "교통", "카페", "구독", "기타"];
const MAX_AMOUNT = 10000000;
const CHART_COLORS = ["#4f8cff", "#ff8a65", "#81c784", "#ffd54f", "#ba68c8", "#4db6ac"];

const cardRecommendations: Record<string, CardRecommendation> = {
  "식비+카페": {
    name: "라이프 다이닝 플러스 카드",
    type: "식비·카페 복합 혜택형",
    benefit: "음식점·배달앱·카페 결제 시 통합 할인 혜택",
    reason: "식비와 카페 소비 비중이 함께 높아 일상 식음료 소비 절약에 적합합니다.",
  },
  "쇼핑+구독": {
    name: "디지털 쇼핑 플러스 카드",
    type: "온라인 쇼핑·구독 복합 혜택형",
    benefit: "온라인 쇼핑몰·OTT·음악 스트리밍 정기결제 할인 혜택",
    reason: "쇼핑과 구독 서비스 소비가 함께 높아 디지털 소비 중심 혜택이 적합합니다.",
  },
  "교통+카페": {
    name: "모빌리티 라이프 카드",
    type: "교통·카페 복합 혜택형",
    benefit: "대중교통·택시·카페 결제 시 할인 혜택",
    reason: "출퇴근 이동과 카페 소비가 함께 발생하는 패턴에 적합합니다.",
  },
  식비: {
    name: "라이프 다이닝 카드",
    type: "식비 혜택형",
    benefit: "음식점·배달앱 결제 시 할인 혜택",
    reason: "식비 소비 비중이 높아 외식·배달 영역 혜택이 유리합니다.",
  },
  쇼핑: {
    name: "플렉스 라이프 카드",
    type: "쇼핑 혜택형",
    benefit: "온라인 쇼핑몰·간편결제 이용 시 할인 혜택",
    reason: "쇼핑 소비 비중이 높아 온라인몰과 간편결제 혜택이 적합합니다.",
  },
  교통: {
    name: "트래블 무브 카드",
    type: "교통 혜택형",
    benefit: "버스·지하철·택시 이용 시 할인 혜택",
    reason: "교통비 비중이 높아 대중교통 할인 혜택이 유리합니다.",
  },
  카페: {
    name: "데일리 브레이크 카드",
    type: "카페 혜택형",
    benefit: "카페 프랜차이즈 결제 시 할인 혜택",
    reason: "카페 소비 비중이 높아 커피·디저트 할인 혜택이 적합합니다.",
  },
  구독: {
    name: "디지털 플러스 카드",
    type: "구독 서비스 혜택형",
    benefit: "OTT·음악 스트리밍·정기구독 서비스 할인 혜택",
    reason: "구독 서비스 소비가 많아 정기결제 할인 혜택이 적합합니다.",
  },
  기타: {
    name: "올데이 라이프 카드",
    type: "생활 통합 혜택형",
    benefit: "생활·편의점·마트 등 다양한 영역의 통합 할인 혜택",
    reason: "소비가 여러 영역에 분산되어 생활 전반 혜택이 적합합니다.",
  },
};

function App() {
  const [income, setIncome] = useState(() => localStorage.getItem("income") || "");
  const [budget, setBudget] = useState(() => localStorage.getItem("budget") || "");
  const [savingGoal, setSavingGoal] = useState(() => localStorage.getItem("savingGoal") || "");
  const [nickname, setNickname] = useState(() => localStorage.getItem("nickname") || "");

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachMessage, setAiCoachMessage] = useState("");

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses");
    return saved ? JSON.parse(saved) : [];
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const incomeNumber = Number(income);
  const budgetNumber = Number(budget);
  const savingGoalNumber = Number(savingGoal);

  const filteredExpenses = expenses.filter(
    (item) => item.date.slice(0, 7) === selectedMonth
  );

  const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const expectedSaving = incomeNumber - totalExpense;

  const savingRate = incomeNumber > 0 ? Math.round((expectedSaving / incomeNumber) * 100) : 0;
  const savingGoalAchievementRate =
    savingGoalNumber > 0 ? Math.round((expectedSaving / savingGoalNumber) * 100) : 0;

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getRemainingDaysInMonth = () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    if (selectedMonth !== currentMonth) return 0;

    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return lastDay - today.getDate() + 1;
  };

  const isBudgetSet = budgetNumber > 0;
  const remainingBudget = budgetNumber - totalExpense;
  const remainingDays = getRemainingDaysInMonth();
  const dailyRecommendedSpending =
    isBudgetSet && remainingBudget > 0 && remainingDays > 0
      ? Math.floor(remainingBudget / remainingDays)
      : 0;

  const isOverBudget = isBudgetSet && totalExpense > budgetNumber;
  const budgetUsageRate = isBudgetSet ? Math.round((totalExpense / budgetNumber) * 100) : 0;
  const isBudgetWarning = isBudgetSet && budgetUsageRate >= 80 && !isOverBudget;

  const categoryTotals = filteredExpenses.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const trendData = Object.entries(
    filteredExpenses.reduce<Record<string, number>>((acc, item) => {
      acc[item.date] = (acc[item.date] || 0) + item.amount;
      return acc;
    }, {})
  )
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  const topCategoryRate =
    topCategory && totalExpense > 0 ? Math.round((topCategory[1] / totalExpense) * 100) : 0;

  const recommendedCard =
    topCategory && cardRecommendations[topCategory[0]] ? cardRecommendations[topCategory[0]] : null;

  const getCategoryRate = (categoryName: string) => {
    const value = categoryTotals[categoryName] || 0;
    return totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0;
  };

  const compositeCardCandidates = [
    { key: "식비+카페", categories: ["식비", "카페"], rate: getCategoryRate("식비") + getCategoryRate("카페") },
    { key: "쇼핑+구독", categories: ["쇼핑", "구독"], rate: getCategoryRate("쇼핑") + getCategoryRate("구독") },
    { key: "교통+카페", categories: ["교통", "카페"], rate: getCategoryRate("교통") + getCategoryRate("카페") },
  ];

  const singleCardCandidates = sortedCategories.map(([categoryName, total]) => ({
    key: categoryName,
    categories: [categoryName],
    rate: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
  }));

  const top3CardRecommendations = [...compositeCardCandidates, ...singleCardCandidates]
    .filter((item) => item.rate >= 15)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((item) => {
      let recommendationLevel = "참고 추천";
      if (item.rate >= 50) recommendationLevel = "강력 추천";
      else if (item.rate >= 30) recommendationLevel = "추천";
      else if (item.rate >= 15) recommendationLevel = "보조 추천";

      return {
        ...item,
        card: cardRecommendations[item.key],
        recommendationLevel,
      };
    })
    .filter((item) => item.card);

  useEffect(() => {
    localStorage.setItem("income", income);
  }, [income]);

  useEffect(() => {
    localStorage.setItem("budget", budget);
  }, [budget]);

  useEffect(() => {
    localStorage.setItem("savingGoal", savingGoal);
  }, [savingGoal]);

  useEffect(() => {
    localStorage.setItem("nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  const isFutureDate = (value: string) => {
    if (!value) return false;
    return value > getTodayString();
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "8px",
  };

  const labelStyle = {
    width: "90px",
    textAlign: "right" as const,
  };

  const validateExpenseInput = (
    inputCategory: string,
    inputAmount: string,
    inputDate: string
  ) => {
    if (income.trim() === "") return "월 수입을 입력해주세요.";
    if (inputDate.trim() === "") return "소비 날짜를 입력해주세요.";
    if (isFutureDate(inputDate)) return "오늘 이전의 날짜만 선택할 수 있습니다.";
    if (inputCategory.trim() === "") return "소비 카테고리를 선택해주세요.";
    if (inputAmount.trim() === "") return "소비 금액을 입력해주세요.";
    if (Number(inputAmount) <= 0) return "음수 금액 입력 불가";
    if (Number(inputAmount) > MAX_AMOUNT) return "입력 가능한 금액을 초과했습니다.";
    return "";
  };

  const normalizeText = (text: string) => text.replace(/\s+/g, "");

  const extractAmountFromText = (fullText: string) => {
    const compactText = normalizeText(fullText);

    const cleanAmount = (value: string) => Number(value.replace(/[^\d]/g, ""));

    const isValidAmount = (num: number) => {
      if (num < 1000) return false;
      if (num > MAX_AMOUNT) return false;

      // 사업자번호, 전화번호, 승인번호처럼 너무 긴 숫자 제거
      if (String(num).length >= 8) return false;

      return true;
    };

    const amountRegex = /[₩￦Ww]?\s*\d{1,3}\s*(?:[,.]\s*|\s+)\d{3}/g;

    const findAmountsNearKeyword = (
      targetText: string,
      keywordPattern: RegExp,
      range = 120
    ) => {
      const matchKeyword = targetText.match(keywordPattern);

      if (!matchKeyword || matchKeyword.index === undefined) {
        return [];
      }

      const start = Math.max(0, matchKeyword.index - 20);
      const end = matchKeyword.index + range;
      const nearText = targetText.slice(start, end);

      return (nearText.match(amountRegex) || [])
        .map(cleanAmount)
        .filter(isValidAmount);
    };

    // 1순위: 실제 결제 금액을 의미하는 키워드
    const paymentKeywordPatterns = [
      /받\s*을\s*금\s*액/i,
      /받\s*은\s*금\s*액/i,
      /결\s*제\s*금\s*액/i,
      /승\s*인\s*금\s*액/i,
      /청\s*구\s*금\s*액/i,
      /총\s*결\s*제\s*금\s*액/i,
      /카\s*드\s*결\s*제/i,
      /신\s*용\s*카\s*드/i,
    ];

    for (const keywordPattern of paymentKeywordPatterns) {
      const amounts = findAmountsNearKeyword(fullText, keywordPattern, 160);

      if (amounts.length > 0) {
        return String(Math.max(...amounts));
      }
    }

    // 2순위: 합계/소계 계열 키워드
    const totalKeywordPatterns = [
      /합\s*계\s*금\s*액/i,
      /합\s*계/i,
      /총\s*구\s*매\s*액/i,
      /총\s*구매\s*금액/i,
      /소\s*계/i,
      /총\s*액/i,
    ];

    for (const keywordPattern of totalKeywordPatterns) {
      const amounts = findAmountsNearKeyword(fullText, keywordPattern, 120);

      if (amounts.length > 0) {
        return String(Math.max(...amounts));
      }
    }

    // 3순위: 압축 텍스트에서 키워드 근처 탐색
    const compactKeywords = [
      "받을금액",
      "받은금액",
      "결제금액",
      "승인금액",
      "청구금액",
      "총결제금액",
      "카드결제",
      "신용카드",
      "합계금액",
      "합계",
      "총구매액",
      "총구매금액",
      "소계",
      "총액",
    ];

    for (const keyword of compactKeywords) {
      const idx = compactText.indexOf(keyword);

      if (idx !== -1) {
        const nearText = compactText.slice(idx, idx + 100);
        const matches = nearText.match(/[₩￦Ww]?\d{1,3}[,.]\d{3}/g);

        const amounts = (matches || [])
          .map(cleanAmount)
          .filter(isValidAmount);

        if (amounts.length > 0) {
          return String(Math.max(...amounts));
        }
      }
    }

    // 4순위: 전체 금액 후보 중 현실적인 결제 금액만 선택
    const candidates =
      fullText.match(amountRegex)?.map(cleanAmount).filter(isValidAmount) || [];

    if (candidates.length === 0) return "";

    return String(Math.max(...candidates));
  };

  const extractDateFromText = (fullText: string) => {
    const dateMatch =
      fullText.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}/) ||
    fullText.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/) ||
    fullText.match(/20\d{6}(?=[\s-])/) ||
    fullText.match(/\d{2}[./-]\d{1,2}[./-]\d{1,2}/);

    if (!dateMatch) return "";

    const rawDate = dateMatch[0];

    if (/^\d{8}$/.test(rawDate)) {
      const year = rawDate.slice(0, 4);
      const month = rawDate.slice(4, 6);
      const day = rawDate.slice(6, 8);

      return `${year}-${month}-${day}`;
    }

    if (rawDate.includes("년")) {
      const parts = rawDate.match(/\d+/g);

      if (parts && parts.length >= 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, "0");
        const day = parts[2].padStart(2, "0");

        return `${year}-${month}-${day}`;
      }
    }

    const parts = rawDate.split(/[./-]/);

    if (parts.length >= 3) {
      let year = parts[0];

      if (year.length === 2) {
        year = `20${year}`;
      }

      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return "";
  };

  const classifyCategoryFromText = (fullText: string) => {
    const compactText = normalizeText(fullText).toLowerCase();

    if (
      compactText.includes("스타벅스") ||
      compactText.includes("이디야") ||
      compactText.includes("메가커피") ||
      compactText.includes("투썸") ||
      compactText.includes("커피") ||
      compactText.includes("카페")
    ) {
      return "카페";
    }

    if (
      compactText.includes("세븐일레븐") ||
      compactText.includes("7eleven") ||
      compactText.includes("7-eleven") ||
      compactText.includes("편의점") ||
      compactText.includes("cu") ||
      compactText.includes("gs25") ||
      compactText.includes("이마트24") ||
      compactText.includes("농협") ||
      compactText.includes("하나로마트") ||
      compactText.includes("이마트") ||
      compactText.includes("홈플러스") ||
      compactText.includes("롯데마트") ||
      compactText.includes("마트") ||
      compactText.includes("맥도날드") ||
      compactText.includes("버거킹") ||
      compactText.includes("롯데리아") ||
      compactText.includes("배달") ||
      compactText.includes("식당") ||
      compactText.includes("김밥") ||
      compactText.includes("치킨") ||
      compactText.includes("피자") ||
      compactText.includes("푸드") ||
      compactText.includes("분식")
    ) {
      return "식비";
    }

    if (
      compactText.includes("쿠팡") ||
      compactText.includes("올리브영") ||
      compactText.includes("cj올리브네트웍스") ||
      compactText.includes("무신사") ||
      compactText.includes("지그재그") ||
      compactText.includes("에이블리") ||
      compactText.includes("스토어") ||
      compactText.includes("쇼핑")
    ) {
      return "쇼핑";
    }

    if (
      compactText.includes("버스") ||
      compactText.includes("지하철") ||
      compactText.includes("택시") ||
      compactText.includes("교통")
    ) {
      return "교통";
    }

    if (
      compactText.includes("넷플릭스") ||
      compactText.includes("유튜브") ||
      compactText.includes("spotify") ||
      compactText.includes("멜론") ||
      compactText.includes("구독")
    ) {
      return "구독";
    }

    return "기타";
  };

  const handleAddExpense = () => {
    const error = validateExpenseInput(category, amount, date);

    if (error) {
      setErrorMessage(error);
      return;
    }

    const newExpense: Expense = {
      id: Date.now(),
      category,
      amount: Number(amount),
      date,
    };

    setExpenses([...expenses, newExpense]);
    setCategory("");
    setAmount("");
    setDate("");
    setOcrResult(null);
    setAiCoachMessage("");
    setErrorMessage("");
  };

  const handleDeleteExpense = (id: number) => {
    setExpenses(expenses.filter((item) => item.id !== id));
    setAiCoachMessage("");
  };

  const handleStartEdit = (item: Expense) => {
    setEditingId(item.id);
    setEditCategory(item.category);
    setEditAmount(String(item.amount));
    setEditDate(item.date);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategory("");
    setEditAmount("");
    setEditDate("");
  };

  const handleSaveEdit = (id: number) => {
    const error = validateExpenseInput(editCategory, editAmount, editDate);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setExpenses(
      expenses.map((item) =>
        item.id === id
          ? {
              ...item,
              category: editCategory,
              amount: Number(editAmount),
              date: editDate,
            }
          : item
      )
    );

    setEditingId(null);
    setEditCategory("");
    setEditAmount("");
    setEditDate("");
    setAiCoachMessage("");
    setErrorMessage("");
  };

  const handleReceiptUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("올바른 영수증 이미지가 아닙니다.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setReceiptImage(imageUrl);
    setReceiptFile(file);
    setOcrResult(null);
    setErrorMessage("");
  };

  const handleOCR = async () => {
    if (!receiptFile) {
      setErrorMessage("영수증 이미지를 먼저 업로드해주세요.");
      return;
    }

    setOcrLoading(true);
    setErrorMessage("");
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append("image", receiptFile);

      const response = await fetch("http://localhost:4000/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage("OCR 분석에 실패했습니다. 재촬영하거나 직접 입력해주세요.");
        return;
      }

      const fields =
        data.images?.[0]?.fields?.map((field: { inferText: string }) => field.inferText) || [];

      const fullText = fields.join(" ");
      console.log("OCR TEXT:", fullText);

      const detectedAmount = extractAmountFromText(fullText);
      const detectedDate = extractDateFromText(fullText);
      const detectedCategory = classifyCategoryFromText(fullText);

      if (!detectedAmount) {
        setAmount("");
        setErrorMessage("금액을 인식하지 못했습니다. 직접 입력해주세요.");
        return;
      }

      if (!detectedDate || isFutureDate(detectedDate)) {
        setDate("");
        setErrorMessage("영수증 날짜를 인식하지 못했습니다. 날짜를 직접 입력해주세요.");
        return;
      }

      setAmount(detectedAmount);
      setDate(detectedDate);
      setCategory(detectedCategory);
      setOcrResult({ date: detectedDate, category: detectedCategory, amount: detectedAmount });
    } catch (error) {
      console.error(error);
      setErrorMessage("OCR 분석 중 오류가 발생했습니다.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSaveOcrResult = () => {
    if (!ocrResult) {
      setErrorMessage("저장할 OCR 결과가 없습니다.");
      return;
    }

    const error = validateExpenseInput(ocrResult.category, ocrResult.amount, ocrResult.date);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setExpenses([
      ...expenses,
      {
        id: Date.now(),
        category: ocrResult.category,
        amount: Number(ocrResult.amount),
        date: ocrResult.date,
      },
    ]);

    setCategory("");
    setAmount("");
    setDate("");
    setOcrResult(null);
    setAiCoachMessage("");
    setErrorMessage("");
  };

  const handleDownloadCSV = () => {
    if (filteredExpenses.length === 0) {
      setErrorMessage("다운로드할 소비 내역이 없습니다.");
      return;
    }

    const csv =
      "날짜,카테고리,금액\n" +
      filteredExpenses
        .map((item) => `${item.date},${item.category},${item.amount}`)
        .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `expenses_${selectedMonth}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleGenerateAiCoach = async () => {
    if (filteredExpenses.length === 0) {
      setErrorMessage("소비 데이터를 입력한 뒤 AI 코칭을 실행해주세요.");
      return;
    }

    setAiCoachLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:4000/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname || "사용자",
          income: incomeNumber,
          budget: budgetNumber,
          savingGoal: savingGoalNumber,
          totalExpense,
          expectedSaving,
          savingRate,
          savingGoalAchievementRate,
          budgetUsageRate,
          topCategory: topCategory ? topCategory[0] : "없음",
          topCategoryRate,
          isOverBudget,
          isBudgetWarning,
          dailyRecommendedSpending,
          expenses: filteredExpenses,
          categoryTotals,
          recommendedCards: top3CardRecommendations.map((item) => ({
            cardName: item.card.name,
            categories: item.categories,
            rate: item.rate,
            level: item.recommendationLevel,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "AI 코칭 생성에 실패했습니다.");
        return;
      }

      setAiCoachMessage(data.message);
    } catch (error) {
      console.error(error);
      setErrorMessage("AI 코칭 요청 중 오류가 발생했습니다.");
    } finally {
      setAiCoachLoading(false);
    }
  };

  const handleCardRecommendationClick = (
    cardName: string,
    categoryText: string,
    rate: number
  ) => {
    alert(`${cardName}\n\n추천 기준: ${categoryText} 소비 비중 ${rate}%`);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>스마트 소비 관리 서비스</h1>
      <p>영수증 OCR과 소비 분석을 통해 맞춤형 절약 피드백을 제공하는 서비스</p>

      <hr />

      <h2>월 수입 / 예산 / 저축 목표 입력</h2>

      <div style={rowStyle}>
        <label style={labelStyle}>닉네임</label>
        <input
          type="text"
          placeholder="닉네임 입력"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>월 수입</label>
        <input
          type="number"
          placeholder="월 수입 입력"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>월 예산</label>
        <input
          type="number"
          placeholder="월 예산 입력"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>저축 목표</label>
        <input
          type="number"
          placeholder="월 저축 목표 입력"
          value={savingGoal}
          onChange={(e) => setSavingGoal(e.target.value)}
        />
      </div>

      <p>{isBudgetSet ? `월 예산: ${budgetNumber.toLocaleString()}원` : "예산 미설정 상태"}</p>

      <hr />

      <h2>영수증 업로드 / OCR</h2>
      <input type="file" accept="image/*" onChange={handleReceiptUpload} />

      {receiptImage && (
        <div>
          <br />
          <img src={receiptImage} alt="영수증 미리보기" width="220" />
          <br />
          <button onClick={handleOCR} disabled={ocrLoading}>
            {ocrLoading ? "OCR 분석 중..." : "OCR 분석 실행"}
          </button>
        </div>
      )}

      {ocrResult && (
        <div style={{ marginTop: "20px", backgroundColor: "#f5f5f5", padding: "16px", borderRadius: "10px" }}>
          <h3>OCR 인식 결과 수정</h3>

          <p>
            <strong>OCR 인식 날짜:</strong> {ocrResult.date}
          </p>

          {ocrResult.category === "기타" && (
            <p style={{ color: "orange" }}>
              등록되지 않은 상호명이라 카테고리를 자동 분류하지 못했습니다.
              날짜와 금액은 인식되었으므로 필요한 경우 카테고리만 직접 수정해주세요.
            </p>
          )}

          <div style={rowStyle}>
            <label style={labelStyle}>날짜 수정</label>
            <input
              type="date"
              max={getTodayString()}
              value={ocrResult.date}
              onChange={(e) =>
                setOcrResult({
                  ...ocrResult,
                  date: e.target.value,
                })
              }
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>카테고리</label>
            <select
              value={ocrResult.category}
              onChange={(e) =>
                setOcrResult({
                  ...ocrResult,
                  category: e.target.value,
                })
              }
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>금액</label>
            <input
              type="number"
              value={ocrResult.amount}
              onChange={(e) =>
                setOcrResult({
                  ...ocrResult,
                  amount: e.target.value,
                })
              }
            />
          </div>

          <button onClick={handleSaveOcrResult}>수정한 OCR 결과 저장</button>
        </div>
      )}

      <hr />

      <h2>소비 내역 입력</h2>

      <div style={rowStyle}>
        <label style={labelStyle}>소비 날짜</label>
        <input
          type="date"
          max={getTodayString()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>카테고리</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">카테고리 선택</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>소비 금액</label>
        <input
          type="number"
          placeholder="금액 입력"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button onClick={handleAddExpense}>소비 저장</button>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      <hr />

      <h2>소비 내역</h2>

      {filteredExpenses.length === 0 ? (
        <p>아직 등록된 소비 내역이 없습니다.</p>
      ) : (
        <ul>
          {filteredExpenses.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <>
                  <input
                    type="date"
                    max={getTodayString()}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>
                        {categoryName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                  <button onClick={() => handleSaveEdit(item.id)}>저장</button>
                  <button onClick={handleCancelEdit}>취소</button>
                </>
              ) : (
                <>
                  {item.date} / {item.category} - {item.amount.toLocaleString()}원{" "}
                  <button onClick={() => handleStartEdit(item)}>수정</button>
                  <button onClick={() => handleDeleteExpense(item.id)}>삭제</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "20px" }}>
        <div style={rowStyle}>
          <label style={labelStyle}>조회 월</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <button onClick={handleDownloadCSV}>선택 월 CSV 다운로드</button>
      </div>

      <hr />

      <h2>소비 분석</h2>
      <p>총 소비액: {totalExpense.toLocaleString()}원</p>
      <p>예산 사용률: {budgetUsageRate}%</p>
      <p>예상 저축 가능 금액: {expectedSaving.toLocaleString()}원</p>
      <p>월별 절약률: {savingRate}%</p>

      {savingGoalNumber > 0 && <p>저축 목표 달성률: {savingGoalAchievementRate}%</p>}

      {savingGoalNumber > 0 && expectedSaving >= savingGoalNumber && (
        <p style={{ color: "green" }}>
          저축 목표를 달성할 수 있어요! 현재 소비 흐름을 유지해보세요.
        </p>
      )}

      {isBudgetWarning && (
        <p style={{ color: "orange" }}>예산의 80%를 사용했습니다. 지출에 유의하세요!</p>
      )}

      {isOverBudget && (
        <p style={{ color: "red" }}>
          소비 예산을 넘어섰어요. 지출내역을 검토하고 불필요한 소비는 줄여야 해요.
        </p>
      )}

      {dailyRecommendedSpending > 0 && (
        <p>
          이번 달 남은 기간 동안 하루 권장 소비액은 약{" "}
          {dailyRecommendedSpending.toLocaleString()}원입니다.
        </p>
      )}

      <h3>카테고리별 소비</h3>
      {Object.keys(categoryTotals).length === 0 ? (
        <p>분석할 소비 데이터가 없습니다.</p>
      ) : (
        Object.entries(categoryTotals).map(([name, total]) => (
          <p key={name}>
            {name}: {total.toLocaleString()}원 ({Math.round((total / totalExpense) * 100)}%)
          </p>
        ))
      )}

      {chartData.length > 0 && (
        <PieChart width={420} height={320}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
          <Legend />
        </PieChart>
      )}

      <hr />

      <h3>날짜별 소비 추이</h3>

      {trendData.length === 0 ? (
        <p>소비 추이 데이터를 표시할 수 없습니다.</p>
      ) : (
        <LineChart width={500} height={300} data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
          <Legend />
          <Line type="monotone" dataKey="total" name="일별 소비액" stroke="#4f8cff" strokeWidth={3} />
        </LineChart>
      )}

      <hr />

      <h2>월간 소비 리포트</h2>

      {filteredExpenses.length === 0 ? (
        <p>선택한 월의 소비 데이터를 입력하면 월간 소비 리포트가 생성됩니다.</p>
      ) : (
        <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "10px" }}>
          <p><strong>총 소비액:</strong> {totalExpense.toLocaleString()}원</p>
          <p><strong>가장 많이 쓴 카테고리:</strong> {topCategory ? `${topCategory[0]} (${topCategoryRate}%)` : "없음"}</p>
          <p><strong>예산 사용률:</strong> {budgetUsageRate}%</p>
          <p><strong>예상 저축 가능 금액:</strong> {expectedSaving.toLocaleString()}원</p>
          <p><strong>월별 절약률:</strong> {savingRate}%</p>
          <p><strong>추천 카드:</strong> {recommendedCard ? recommendedCard.name : "소비 데이터 부족"}</p>
        </div>
      )}

      <hr />

      <h2>스마트 소비 코치</h2>

      <button onClick={handleGenerateAiCoach} disabled={aiCoachLoading}>
        {aiCoachLoading ? "AI 코칭 생성 중..." : "맞춤 소비 분석 받기"}
      </button>

      {aiCoachMessage && (
        <div
          style={{
            marginTop: "15px",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "10px",
            whiteSpace: "pre-line",
          }}
        >
          {aiCoachMessage}
        </div>
      )}

      <hr />

      <h2>소비패턴 기반 카드 추천 TOP 3</h2>

      {filteredExpenses.length <= 1 ? (
        <p>소비 데이터를 더 입력하면 카드 추천이 가능해요.</p>
      ) : top3CardRecommendations.length > 0 ? (
        <div>
          {top3CardRecommendations.map((item, index) => (
            <div
              key={item.key}
              onClick={() =>
                handleCardRecommendationClick(
                  item.card.name,
                  item.categories.join(" + "),
                  item.rate
                )
              }
              style={{
                backgroundColor: "#eef6ff",
                padding: "20px",
                borderRadius: "10px",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              <h3>{index + 1}순위. {item.card.name}</h3>
              <p><strong>추천 등급:</strong> {item.recommendationLevel}</p>
              <p><strong>추천 기준:</strong> {item.categories.join(" + ")} 소비 비중 {item.rate}%</p>
              <p><strong>추천 유형:</strong> {item.card.type}</p>
              <p><strong>주요 혜택:</strong> {item.card.benefit}</p>
              <p><strong>추천 이유:</strong> {item.card.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>소비 데이터를 더 입력하면 카드 추천이 가능해요.</p>
      )}

      <hr />

      <button
        onClick={() => {
          if (window.confirm("모든 데이터를 삭제할까요?")) {
            localStorage.clear();
            window.location.reload();
          }
        }}
        style={{ marginTop: "20px", color: "red" }}
      >
        전체 데이터 초기화
      </button>
    </div>
  );
}

export default App;