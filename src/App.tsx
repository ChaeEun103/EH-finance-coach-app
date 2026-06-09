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
import "./App.css";

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

type RecommendationItem = {
  key: string;
  categories: string[];
  rate: number;
  card: CardRecommendation;
  recommendationLevel: string;
};

type AnalysisPeriod = "day" | "month" | "year";

const categories = ["식비", "쇼핑", "교통", "카페", "구독", "기타"];
const MAX_AMOUNT = 10000000;
const CHART_COLORS = [
  "#2563eb",
  "#38bdf8",
  "#60a5fa",
  "#93c5fd",
  "#1e40af",
  "#0f172a",
];

const cardRecommendations: Record<string, CardRecommendation> = {
  "식비+카페": {
    name: "라이프 다이닝 플러스 카드",
    type: "식비·카페 복합 혜택형",
    benefit: "음식점·배달앱·카페 결제 시 통합 할인 혜택",
    reason:
      "식비와 카페 소비 비중이 함께 높아 일상 식음료 소비 절약에 적합합니다.",
  },
  "쇼핑+구독": {
    name: "디지털 쇼핑 플러스 카드",
    type: "온라인 쇼핑·구독 복합 혜택형",
    benefit: "온라인 쇼핑몰·OTT·음악 스트리밍 정기결제 할인 혜택",
    reason:
      "쇼핑과 구독 서비스 소비가 함께 높아 디지털 소비 중심 혜택이 적합합니다.",
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
  const [activePage, setActivePage] = useState("dashboard");

  const [income, setIncome] = useState(
    () => localStorage.getItem("income") || ""
  );
  const [budget, setBudget] = useState(
    () => localStorage.getItem("budget") || ""
  );
  const [savingGoal, setSavingGoal] = useState(
    () => localStorage.getItem("savingGoal") || ""
  );
  const [nickname, setNickname] = useState(
    () => localStorage.getItem("nickname") || ""
  );

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

  const [analysisPeriod, setAnalysisPeriod] =
    useState<AnalysisPeriod>("month");
  const [analysisDate, setAnalysisDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [analysisMonth, setAnalysisMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [analysisYear, setAnalysisYear] = useState(
    String(new Date().getFullYear())
  );

  const incomeNumber = Number(income);
  const budgetNumber = Number(budget);
  const savingGoalNumber = Number(savingGoal);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const listExpenses = [...expenses].sort((a, b) =>
    b.date.localeCompare(a.date)
  );


  const analysisExpenses = expenses
    .filter((item) => {
      if (analysisPeriod === "day") {
        return item.date === analysisDate;
      }

      if (analysisPeriod === "month") {
        return item.date.slice(0, 7) === analysisMonth;
      }

      return item.date.slice(0, 4) === analysisYear;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const periodExpense = analysisExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const expectedSaving = incomeNumber - periodExpense;

  const savingRate =
    incomeNumber > 0 ? Math.round((expectedSaving / incomeNumber) * 100) : 0;

  const savingGoalAchievementRate =
    savingGoalNumber > 0
      ? Math.round((expectedSaving / savingGoalNumber) * 100)
      : 0;

  const isBudgetSet = budgetNumber > 0;
  const remainingBudget = budgetNumber - periodExpense;

  const budgetUsageRate = isBudgetSet
    ? Math.round((periodExpense / budgetNumber) * 100)
    : 0;

  const isOverBudget = isBudgetSet && periodExpense > budgetNumber;
  const isBudgetWarning =
    isBudgetSet && budgetUsageRate >= 80 && !isOverBudget;

  const getRemainingDaysInMonth = () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    if (analysisPeriod !== "month") return 0;
    if (analysisMonth !== currentMonth) return 0;

    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    return lastDay - today.getDate() + 1;
  };

  const remainingDays = getRemainingDaysInMonth();

  const dailyRecommendedSpending =
    isBudgetSet && remainingBudget > 0 && remainingDays > 0
      ? Math.floor(remainingBudget / remainingDays)
      : 0;

  const categoryTotals = analysisExpenses.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    },
    {}
  );

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  const trendData = Object.entries(
    analysisExpenses.reduce<Record<string, number>>((acc, item) => {
      let key = item.date;

      if (analysisPeriod === "year") {
        key = item.date.slice(0, 7);
      }

      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {})
  )
    .map(([dateValue, total]) => ({
      date: dateValue,
      total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const overallCategoryTotals = expenses.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    },
    {}
  );

  const overallSortedCategories = Object.entries(overallCategoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const overallTopCategory = overallSortedCategories[0];

  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const topCategory = sortedCategories[0];

  const topCategoryRate =
    topCategory && periodExpense > 0
      ? Math.round((topCategory[1] / periodExpense) * 100)
      : 0;

  const recommendedCard =
    topCategory && cardRecommendations[topCategory[0]]
      ? cardRecommendations[topCategory[0]]
      : null;

  const getCategoryRate = (categoryName: string) => {
    const value = categoryTotals[categoryName] || 0;
    return periodExpense > 0 ? Math.round((value / periodExpense) * 100) : 0;
  };

  const compositeCardCandidates = [
    {
      key: "식비+카페",
      categories: ["식비", "카페"],
      rate: getCategoryRate("식비") + getCategoryRate("카페"),
    },
    {
      key: "쇼핑+구독",
      categories: ["쇼핑", "구독"],
      rate: getCategoryRate("쇼핑") + getCategoryRate("구독"),
    },
    {
      key: "교통+카페",
      categories: ["교통", "카페"],
      rate: getCategoryRate("교통") + getCategoryRate("카페"),
    },
  ];

  const singleCardCandidates = sortedCategories.map(
    ([categoryName, total]) => ({
      key: categoryName,
      categories: [categoryName],
      rate: periodExpense > 0 ? Math.round((total / periodExpense) * 100) : 0,
    })
  );

  const top3CardRecommendations: RecommendationItem[] = [
    ...compositeCardCandidates,
    ...singleCardCandidates,
  ]
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
    .filter((item): item is RecommendationItem => Boolean(item.card));

  const getAnalysisLabel = () => {
    if (analysisPeriod === "day") return `${analysisDate} 일간 분석`;
    if (analysisPeriod === "month") return `${analysisMonth} 월간 분석`;
    return `${analysisYear} 연간 분석`;
  };

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
    if (Number(inputAmount) > MAX_AMOUNT)
      return "입력 가능한 금액을 초과했습니다.";
    return "";
  };

  const normalizeText = (text: string) => text.replace(/\s+/g, "");

  const extractAmountFromText = (fullText: string) => {
    const compactText = normalizeText(fullText);
    const cleanAmount = (value: string) => Number(value.replace(/[^\d]/g, ""));

    const isValidAmount = (num: number) => {
      if (num < 1000) return false;
      if (num > MAX_AMOUNT) return false;
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

      if (!matchKeyword || matchKeyword.index === undefined) return [];

      const start = Math.max(0, matchKeyword.index - 20);
      const end = matchKeyword.index + range;
      const nearText = targetText.slice(start, end);

      return (nearText.match(amountRegex) || [])
        .map(cleanAmount)
        .filter(isValidAmount);
    };

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
      if (amounts.length > 0) return String(Math.max(...amounts));
    }

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
      if (amounts.length > 0) return String(Math.max(...amounts));
    }

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

        if (amounts.length > 0) return String(Math.max(...amounts));
      }
    }

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

      if (year.length === 2) year = `20${year}`;

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

    setExpenses((prev) => [newExpense, ...prev]);

    setAnalysisDate(date);
    setAnalysisMonth(date.slice(0, 7));
    setAnalysisYear(date.slice(0, 4));

    setActivePage("list");
    setCategory("");
    setAmount("");
    setDate("");
    setOcrResult(null);
    setAiCoachMessage("");
    setErrorMessage("");
  };

  const handleDeleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
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

    setExpenses((prev) =>
      prev.map((item) =>
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

    setAnalysisDate(editDate);
    setAnalysisMonth(editDate.slice(0, 7));
    setAnalysisYear(editDate.slice(0, 4));

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

    setReceiptImage(URL.createObjectURL(file));
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

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage("OCR 분석에 실패했습니다. 재촬영하거나 직접 입력해주세요.");
        return;
      }

      const fields =
        data.images?.[0]?.fields?.map(
          (field: { inferText: string }) => field.inferText
        ) || [];

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
      setOcrResult({
        date: detectedDate,
        category: detectedCategory,
        amount: detectedAmount,
      });
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

    const error = validateExpenseInput(
      ocrResult.category,
      ocrResult.amount,
      ocrResult.date
    );

    if (error) {
      setErrorMessage(error);
      return;
    }

    const newExpense: Expense = {
      id: Date.now(),
      category: ocrResult.category,
      amount: Number(ocrResult.amount),
      date: ocrResult.date,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    setAnalysisDate(ocrResult.date);
    setAnalysisMonth(ocrResult.date.slice(0, 7));
    setAnalysisYear(ocrResult.date.slice(0, 4));

    setActivePage("list");
    setCategory("");
    setAmount("");
    setDate("");
    setOcrResult(null);
    setReceiptImage(null);
    setReceiptFile(null);
    setAiCoachMessage("");
    setErrorMessage("");
  };

  const handleDownloadCSV = () => {
    const csvTargetExpenses = expenses.filter((item) => {
      if (analysisPeriod === "day") return item.date === analysisDate;
      if (analysisPeriod === "month") {
        return item.date.slice(0, 7) === analysisMonth;
      }
      return item.date.slice(0, 4) === analysisYear;
    });

    if (csvTargetExpenses.length === 0) {
      setErrorMessage("다운로드할 소비 내역이 없습니다.");
      return;
    }

    const csv =
      "날짜,카테고리,금액\n" +
      csvTargetExpenses
        .map((item) => `${item.date},${item.category},${item.amount}`)
        .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const fileLabel =
      analysisPeriod === "day"
        ? analysisDate
        : analysisPeriod === "month"
        ? analysisMonth
        : analysisYear;

    link.href = url;
    link.download = `${fileLabel}_소비내역.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleGenerateAiCoach = async () => {
    if (analysisExpenses.length === 0) {
      setErrorMessage("소비 데이터를 입력한 뒤 AI 코칭을 실행해주세요.");
      return;
    }

    setAiCoachLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname || "사용자",
          income: incomeNumber,
          budget: budgetNumber,
          savingGoal: savingGoalNumber,
          totalExpense: periodExpense,
          expectedSaving,
          savingRate,
          savingGoalAchievementRate,
          budgetUsageRate,
          topCategory: topCategory ? topCategory[0] : "없음",
          topCategoryRate,
          isOverBudget,
          isBudgetWarning,
          dailyRecommendedSpending,
          expenses: analysisExpenses,
          categoryTotals,
          recommendedCards: top3CardRecommendations.map((item) => ({
            cardName: item.card.name,
            categories: item.categories,
            rate: item.rate,
            level: item.recommendationLevel,
          })),
          analysisPeriod,
          analysisLabel: getAnalysisLabel(),
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

  const renderAnalysisControls = () => (
    <section className="card" style={{ marginBottom: 20 }}>
      <h3>분석 기준 선택</h3>

      <div className="button-row">
        <button
          className={analysisPeriod === "day" ? "primary-btn" : "secondary-btn"}
          onClick={() => setAnalysisPeriod("day")}
        >
          일별
        </button>

        <button
          className={
            analysisPeriod === "month" ? "primary-btn" : "secondary-btn"
          }
          onClick={() => setAnalysisPeriod("month")}
        >
          월별
        </button>

        <button
          className={
            analysisPeriod === "year" ? "primary-btn" : "secondary-btn"
          }
          onClick={() => setAnalysisPeriod("year")}
        >
          연도별
        </button>
      </div>

      <div className="form-row" style={{ marginTop: 18 }}>
        <label>분석 기간</label>

        {analysisPeriod === "day" && (
          <input
            className="input"
            type="date"
            max={getTodayString()}
            value={analysisDate}
            onChange={(e) => setAnalysisDate(e.target.value)}
          />
        )}

        {analysisPeriod === "month" && (
          <input
            className="input"
            type="month"
            value={analysisMonth}
            onChange={(e) => setAnalysisMonth(e.target.value)}
          />
        )}

        {analysisPeriod === "year" && (
          <input
            className="input"
            type="number"
            min="2000"
            max="2100"
            value={analysisYear}
            onChange={(e) => setAnalysisYear(e.target.value)}
          />
        )}
      </div>

      <p style={{ marginTop: 10 }}>
        현재 분석 기준: <strong>{getAnalysisLabel()}</strong>
      </p>
    </section>
  );

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-badge">S</div>
        <h1>스마트 소비 관리 서비스</h1>
        <p>AI 기반 소비 분석 및 절약 코칭 플랫폼</p>
      </div>

      <nav className="nav">
        {[
          ["dashboard", "대시보드"],
          ["profile", "기본 정보"],
          ["ocr", "영수증 OCR"],
          ["input", "소비 입력"],
          ["list", "소비 내역"],
          ["analysis", "소비 분석"],
          ["coach", "AI 코치"],
          ["cards", "카드 추천"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={activePage === id ? "active" : ""}
            onClick={() => setActivePage(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );

  const renderProfilePage = () => (
    <section className="card">
      <h3>월 수입 / 예산 / 저축 목표 입력</h3>

      <div className="form-row">
        <label>닉네임</label>
        <input
          className="input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>월 수입</label>
        <input
          className="input"
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>월 예산</label>
        <input
          className="input"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>저축 목표</label>
        <input
          className="input"
          type="number"
          value={savingGoal}
          onChange={(e) => setSavingGoal(e.target.value)}
        />
      </div>
    </section>
  );

  const renderOcrPage = () => (
    <section className="card">
      <h3>영수증 OCR 등록</h3>

      <div className="form-row">
        <label>영수증 이미지</label>
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={handleReceiptUpload}
        />
      </div>

      {receiptImage && (
        <>
          <img className="ocr-preview" src={receiptImage} alt="영수증 미리보기" />
          <br />
          <button
            className="primary-btn"
            onClick={handleOCR}
            disabled={ocrLoading}
          >
            {ocrLoading ? "OCR 분석 중..." : "OCR 분석 실행"}
          </button>
        </>
      )}

      {ocrResult && (
        <div className="report-box" style={{ marginTop: 20 }}>
          <h3>OCR 인식 결과 수정</h3>

          <div className="form-row">
            <label>날짜</label>
            <input
              className="input"
              type="date"
              max={getTodayString()}
              value={ocrResult.date}
              onChange={(e) =>
                setOcrResult({ ...ocrResult, date: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <label>카테고리</label>
            <select
              className="select"
              value={ocrResult.category}
              onChange={(e) =>
                setOcrResult({ ...ocrResult, category: e.target.value })
              }
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>금액</label>
            <input
              className="input"
              type="number"
              value={ocrResult.amount}
              onChange={(e) =>
                setOcrResult({ ...ocrResult, amount: e.target.value })
              }
            />
          </div>

          <button className="primary-btn" onClick={handleSaveOcrResult}>
            수정한 OCR 결과 저장
          </button>
        </div>
      )}
    </section>
  );

  const renderInputPage = () => (
    <section className="card">
      <h3>소비 내역 직접 입력</h3>

      <div className="form-row">
        <label>소비 날짜</label>
        <input
          className="input"
          type="date"
          max={getTodayString()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>카테고리</label>
        <select
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">카테고리 선택</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>소비 금액</label>
        <input
          className="input"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button className="primary-btn" onClick={handleAddExpense}>
        소비 저장
      </button>
    </section>
  );

  const renderListPage = () => (
    <section className="card">
      <h3>소비 내역</h3>

      <p style={{ marginTop: 0 }}>
        아래 목록은 전체 저장 기록입니다. 분석 화면에서 일 / 월 / 년 기준으로
        소비 흐름을 확인할 수 있습니다.
      </p>

      <div className="expense-list" style={{ marginTop: 18 }}>
        {listExpenses.length === 0 ? (
          <p>아직 등록된 소비 내역이 없습니다.</p>
        ) : (
          listExpenses.map((item) => (
            <div className="expense-item" key={item.id}>
              {editingId === item.id ? (
                <>
                  <input
                    className="input"
                    type="date"
                    max={getTodayString()}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />

                  <select
                    className="select"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map((categoryName) => (
                      <option key={categoryName}>{categoryName}</option>
                    ))}
                  </select>

                  <input
                    className="input"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />

                  <button
                    className="primary-btn"
                    onClick={() => handleSaveEdit(item.id)}
                  >
                    저장
                  </button>
                  <button className="secondary-btn" onClick={handleCancelEdit}>
                    취소
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <span className="badge">{item.category}</span>
                    <p>{item.date}</p>
                  </div>

                  <strong>{item.amount.toLocaleString()}원</strong>

                  <div className="button-row">
                    <button
                      className="secondary-btn"
                      onClick={() => handleStartEdit(item)}
                    >
                      수정
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => handleDeleteExpense(item.id)}
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );

  const renderAnalysisPage = () => (
    <>
      {renderAnalysisControls()}

      <div className="grid grid-2">
        <section className="card">
          <h3>소비 분석</h3>

          <div className="report-box">
            <p>
              <strong>전체 소비액:</strong> {totalExpense.toLocaleString()}원
            </p>
            <p>
              <strong>기간 소비액:</strong> {periodExpense.toLocaleString()}원
            </p>
            <p>
              <strong>예산 사용률:</strong> {budgetUsageRate}%
            </p>
            <p>
              <strong>예상 저축 가능 금액:</strong>{" "}
              {expectedSaving.toLocaleString()}원
            </p>
            <p>
              <strong>절약률:</strong> {savingRate}%
            </p>

            {savingGoalNumber > 0 && (
              <p>
                <strong>저축 목표 달성률:</strong>{" "}
                {savingGoalAchievementRate}%
              </p>
            )}

            {savingGoalNumber > 0 && expectedSaving >= savingGoalNumber && (
              <div className="alert success">
                저축 목표를 달성할 수 있어요. 현재 소비 흐름을 유지해보세요.
              </div>
            )}

            {isBudgetWarning && (
              <div className="alert warning">
                예산의 80%를 사용했습니다. 지출에 유의하세요.
              </div>
            )}

            {isOverBudget && (
              <div className="alert">
                소비 예산을 넘어섰어요. 불필요한 소비를 줄여야 해요.
              </div>
            )}

            {dailyRecommendedSpending > 0 && (
              <p>
                이번 달 남은 기간 동안 하루 권장 소비액은 약{" "}
                {dailyRecommendedSpending.toLocaleString()}원입니다.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <h3>카테고리별 소비</h3>

          {Object.keys(categoryTotals).length === 0 ? (
            <p>분석할 소비 데이터가 없습니다.</p>
          ) : (
            Object.entries(categoryTotals).map(([name, total]) => (
              <p key={name}>
                {name}: {total.toLocaleString()}원 (
                {Math.round((total / periodExpense) * 100)}%)
              </p>
            ))
          )}

          {chartData.length > 0 && (
            <div className="chart-wrap">
              <PieChart width={420} height={320}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) =>
                    `${name} ${Math.round((percent || 0) * 100)}%`
                  }
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${Number(value).toLocaleString()}원`}
                />
                <Legend />
              </PieChart>
            </div>
          )}
        </section>

        <section className="card">
          <h3>
            {analysisPeriod === "year"
              ? "월별 소비 추이"
              : analysisPeriod === "month"
              ? "일별 소비 추이"
              : "일간 소비 추이"}
          </h3>

          {trendData.length === 0 ? (
            <p>소비 추이 데이터를 표시할 수 없습니다.</p>
          ) : (
            <div className="chart-wrap">
              <LineChart width={500} height={300} data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${Number(value).toLocaleString()}원`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="소비액"
                  stroke="#2563eb"
                  strokeWidth={3}
                />
              </LineChart>
            </div>
          )}
        </section>

        <section className="card">
          <h3>{getAnalysisLabel()} 리포트</h3>

          {analysisExpenses.length === 0 ? (
            <p>선택한 기간의 소비 데이터를 입력하면 리포트가 생성됩니다.</p>
          ) : (
            <div className="report-box">
              <p>
                <strong>기간 소비액:</strong>{" "}
                {periodExpense.toLocaleString()}원
              </p>
              <p>
                <strong>가장 많이 쓴 카테고리:</strong>{" "}
                {topCategory ? `${topCategory[0]} (${topCategoryRate}%)` : "없음"}
              </p>
              <p>
                <strong>예산 사용률:</strong> {budgetUsageRate}%
              </p>
              <p>
                <strong>예상 저축 가능 금액:</strong>{" "}
                {expectedSaving.toLocaleString()}원
              </p>
              <p>
                <strong>추천 카드:</strong>{" "}
                {recommendedCard ? recommendedCard.name : "소비 데이터 부족"}
              </p>

              <button className="secondary-btn" onClick={handleDownloadCSV}>
                현재 분석 기간 CSV 다운로드
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );

  const renderCoachPage = () => (
    <section className="card">
      <h3>스마트 소비 코치</h3>

      <p>
        현재 AI 코칭 기준: <strong>{getAnalysisLabel()}</strong>
      </p>

      <button
        className="primary-btn"
        onClick={handleGenerateAiCoach}
        disabled={aiCoachLoading}
      >
        {aiCoachLoading ? "AI 코칭 생성 중..." : "맞춤 소비 분석 받기"}
      </button>

      {aiCoachMessage ? (
        <div className="coach-message" style={{ marginTop: 18 }}>
          {aiCoachMessage}
        </div>
      ) : (
        <div className="report-box" style={{ marginTop: 18 }}>
          소비 데이터를 입력한 뒤 AI 코칭을 실행하면 맞춤형 절약 피드백이
          표시됩니다.
        </div>
      )}
    </section>
  );

  const renderCardsPage = () => (
    <section className="card">
      <h3>소비패턴 기반 카드 추천 TOP 3</h3>

      <p>
        현재 카드 추천 기준: <strong>{getAnalysisLabel()}</strong>
      </p>

      {analysisExpenses.length <= 1 ? (
        <p>소비 데이터를 더 입력하면 카드 추천이 가능해요.</p>
      ) : top3CardRecommendations.length > 0 ? (
        <div className="grid grid-2">
          {top3CardRecommendations.map((item, index) => (
            <div
              key={item.key}
              className="recommend-card"
              onClick={() =>
                handleCardRecommendationClick(
                  item.card.name,
                  item.categories.join(" + "),
                  item.rate
                )
              }
            >
              <span className="badge">{item.recommendationLevel}</span>
              <h3 style={{ marginTop: 14 }}>
                {index + 1}순위. {item.card.name}
              </h3>
              <p>
                <strong>추천 기준:</strong> {item.categories.join(" + ")} 소비
                비중 {item.rate}%
              </p>
              <p>
                <strong>추천 유형:</strong> {item.card.type}
              </p>
              <p>
                <strong>주요 혜택:</strong> {item.card.benefit}
              </p>
              <p>
                <strong>추천 이유:</strong> {item.card.reason}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>소비 데이터를 더 입력하면 카드 추천이 가능해요.</p>
      )}
    </section>
  );

  const renderDashboard = () => (
    <>
      <section className="hero-card">
        <h2>{nickname || "사용자"}님, 소비 흐름을 확인해보세요</h2>
        <p>
          영수증 OCR, 소비 입력, 분석, AI 코치, 카드 추천을 한 번에 관리할 수
          있습니다.
        </p>
      </section>

      <div className="grid grid-4">
        <div className="stat-card">
          <div className="stat-label">전체 소비</div>
          <div className="stat-value">{totalExpense.toLocaleString()}원</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">총 소비 건수</div>
          <div className="stat-value">{expenses.length}건</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">현재 분석 기간 소비</div>
          <div className="stat-value">{periodExpense.toLocaleString()}원</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">전체 최다 소비 항목</div>
          <div className="stat-value">
            {overallTopCategory ? overallTopCategory[0] : "없음"}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h3>전체 소비 리포트</h3>
          {expenses.length === 0 ? (
            <p>소비 데이터를 입력하면 리포트가 생성됩니다.</p>
          ) : (
            <div className="report-box">
              <p>
                전체 소비액은{" "}
                <strong>{totalExpense.toLocaleString()}원</strong>입니다.
              </p>
              <p>
                총 소비 기록은 <strong>{expenses.length}건</strong>입니다.
              </p>
              <p>
                가장 많이 쓴 카테고리는{" "}
                <strong>{overallTopCategory ? overallTopCategory[0] : "없음"}</strong>
                입니다.
              </p>
            </div>
          )}
        </section>

        <section className="card">
          <h3>빠른 이동</h3>
          <div className="button-row">
            <button className="primary-btn" onClick={() => setActivePage("ocr")}>
              영수증 등록
            </button>
            <button
              className="secondary-btn"
              onClick={() => setActivePage("input")}
            >
              수기 입력
            </button>
            <button
              className="secondary-btn"
              onClick={() => setActivePage("analysis")}
            >
              분석 보기
            </button>
          </div>
        </section>
      </div>
    </>
  );

  const renderPage = () => {
    if (activePage === "profile") return renderProfilePage();
    if (activePage === "ocr") return renderOcrPage();
    if (activePage === "input") return renderInputPage();
    if (activePage === "list") return renderListPage();
    if (activePage === "analysis") return renderAnalysisPage();
    if (activePage === "coach") return renderCoachPage();
    if (activePage === "cards") return renderCardsPage();
    return renderDashboard();
  };

  return (
    <div className="app">
      {renderSidebar()}

      <main className="main">
        {errorMessage && <div className="alert">{errorMessage}</div>}
        {renderPage()}

        <button
          className="danger-btn"
          style={{ marginTop: 24 }}
          onClick={() => {
            if (window.confirm("모든 데이터를 삭제할까요?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
        >
          전체 데이터 초기화
        </button>
      </main>
    </div>
  );
}

export default App;