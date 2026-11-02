import {
  verifyDocPercentExample,
  verifyDocQtyExample,
  verifyEquivalenceExample,
  verifyReversePercent,
  verifyNoDoubleCount154,
  calculateWipRow,
  calcClosingByQuantity,
  INCOMPLETE_CONFIG_PRESETS,
} from "../src/pages/Costing/mock/wipCostEngine.ts";
import {
  mockSetPeriod,
  mockRunFaPrepaidLock,
  mockPreviewAllocation,
  mockConfirmAllocation,
  mockCheckStep3,
  mockLockCogsTo154,
  mockSetWipMethod,
  mockPatchWipRow,
  mockPreviewCosting,
  mockPostCosting,
  mockReopenStep,
  buildOverview,
  mockSetIncompletePreset,
} from "../src/pages/Costing/mock/productionCostingMockStore.ts";

const tests = [];
function check(name, ok, detail = "") {
  tests.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " | " + detail : ""}`);
}

check("1 percent", verifyDocPercentExample().ok, verifyDocPercentExample().detail);
check("2 qty", verifyDocQtyExample().ok, verifyDocQtyExample().detail);
check("3 equiv", verifyEquivalenceExample().ok, verifyEquivalenceExample().detail);
check("4 reverse%", verifyReversePercent().ok, verifyReversePercent().detail);

const badPct = calculateWipRow(
  {
    productId: 1,
    productCd: "X",
    productName: "X",
    departmentId: 1,
    departmentCd: "D",
    incompleteQtyOpening: 0,
    beforeAmountResult621: 2e6,
    beforeAmountResult62N: 0,
    amount621: 8e6,
    amount6212: 0,
    amount622: 2e6,
    amount627: 2e6,
    amount154Direct: 0,
    quantity: 100,
    percentCompleted: 120,
    closingIncompleteQty: 0,
    closingAmountOverride: null,
    productReduce: 0,
    previousClosing154: 0,
  },
  "PERCENT_COMPLETED",
);
check("5 % out of range", badPct.errors.some((e) => e.includes("[0, 100]")), badPct.errors.join(";"));

const zeroQty = calculateWipRow(
  {
    productId: 1,
    productCd: "X",
    productName: "X",
    departmentId: 1,
    departmentCd: "D",
    incompleteQtyOpening: 0,
    beforeAmountResult621: 2e6,
    beforeAmountResult62N: 0,
    amount621: 8e6,
    amount6212: 0,
    amount622: 2e6,
    amount627: 2e6,
    amount154Direct: 0,
    quantity: 0,
    percentCompleted: 100,
    closingIncompleteQty: 0,
    closingAmountOverride: null,
    productReduce: 0,
    previousClosing154: 0,
  },
  "PERCENT_COMPLETED",
);
check("6 qty=0 with cost", zeroQty.errors.some((e) => e.includes("SL hoàn thành")), zeroQty.errors.join(";"));

const neg = calcClosingByQuantity(2e6, 8e6, 80, -5, {
  showAllWhenQtyZero: false,
  previousClosing154: 0,
  isRoundInventory: true,
});
check("7 neg Qdd", Boolean(neg.error), neg.error || "");

const over = calculateWipRow(
  {
    productId: 1,
    productCd: "X",
    productName: "X",
    departmentId: 1,
    departmentCd: "D",
    incompleteQtyOpening: 0,
    beforeAmountResult621: 2e6,
    beforeAmountResult62N: 0,
    amount621: 8e6,
    amount6212: 0,
    amount622: 2e6,
    amount627: 2e6,
    amount154Direct: 0,
    quantity: 100,
    percentCompleted: 80,
    closingIncompleteQty: 0,
    closingAmountOverride: 99_000_000,
    productReduce: 0,
    previousClosing154: 0,
  },
  "PERCENT_COMPLETED",
);
check("8 closing > total", over.errors.some((e) => e.includes("lớn hơn tổng")), over.errors.join(";"));

check("9 no double 154", verifyNoDoubleCount154().ok, verifyNoDoubleCount154().detail);

const special = calculateWipRow(
  {
    productId: 1,
    productCd: "X",
    productName: "X",
    departmentId: 1,
    departmentCd: "D",
    incompleteQtyOpening: 10,
    beforeAmountResult621: 1e6,
    beforeAmountResult62N: 500000,
    amount621: 4e6,
    amount6212: 0,
    amount622: 1e6,
    amount627: 1e6,
    amount154Direct: 0,
    quantity: 100,
    percentCompleted: 0,
    closingIncompleteQty: 20,
    closingAmountOverride: null,
    productReduce: 100000,
    previousClosing154: 0,
  },
  "CLOSING_WIP_QUANTITY",
  INCOMPLETE_CONFIG_PRESETS.sl_tp_sx_p08,
);
check(
  "11 split 621/62N",
  special.amountResult621 > 0 &&
    special.amountResult62N > 0 &&
    special.closingIncompleteAmount154 === special.amountResult621 + special.amountResult62N,
  `621=${special.amountResult621} 62N=${special.amountResult62N}`,
);

const withReduce = calculateWipRow(
  {
    productId: 1,
    productCd: "X",
    productName: "X",
    departmentId: 1,
    departmentCd: "D",
    incompleteQtyOpening: 0,
    beforeAmountResult621: 0,
    beforeAmountResult62N: 0,
    amount621: 10e6,
    amount6212: 0,
    amount622: 0,
    amount627: 0,
    amount154Direct: 0,
    quantity: 100,
    percentCompleted: 0,
    closingIncompleteQty: 0,
    closingAmountOverride: null,
    productReduce: 500000,
    previousClosing154: 0,
  },
  "CLOSING_WIP_QUANTITY",
  INCOMPLETE_CONFIG_PRESETS.sl_tp_sx_p08,
);
check(
  "12 PRODUCT_REDUCE",
  withReduce.totalCostPrice === 9_500_000 && withReduce.productReduce === 500000,
  `total=${withReduce.totalCostPrice}`,
);

async function flow() {
  mockSetPeriod("0001", "202610");
  await mockRunFaPrepaidLock();
  mockPreviewAllocation();
  mockConfirmAllocation();
  mockCheckStep3();
  await mockLockCogsTo154();

  let o = buildOverview();
  const before622 = o.wipDetailRows[0].amount622;
  check("10a alloc from step2", before622 === 3_000_000, `622 A01=${before622}`);

  o = mockSetWipMethod("PERCENT_COMPLETED");
  o = mockPatchWipRow(o.wipDetailRows[0].productId, { percentCompleted: 80 });
  const r0 = o.wipDetailRows[0];
  // BEFORE=25M, 621=85M → closing = 110M * 0.2 = 22M
  check("10b percent live", r0.closingIncompleteAmount154 === 22_000_000, `closing=${r0.closingIncompleteAmount154}`);

  o = mockSetWipMethod("CLOSING_WIP_QUANTITY");
  o = mockPatchWipRow(o.wipDetailRows[0].productId, { closingIncompleteQty: 250 });
  // (25M+85M)/(1000+250)*250 = 110M/1250*250 = 22M
  check(
    "10c qty live",
    o.wipDetailRows[0].closingIncompleteAmount154 === 22_000_000,
    `closing=${o.wipDetailRows[0].closingIncompleteAmount154}`,
  );

  o = mockPreviewCosting();
  check("preview ok", o.costPreviewed === true, "");
  await mockPostCosting();
  o = buildOverview();
  const postedUnit = o.aggregateRows[0].unitCost;
  check("13a posted", o.stepStatuses[3] === "DONE" && postedUnit > 0, `unit=${postedUnit}`);

  // reopen step 5 first? step 5 not done yet — can reopen step 4
  o = mockReopenStep(4, "Dieu chinh % demo");
  check("13b reopen keep unit on receipt", o.receiptRows[0].oldUnitPrice === postedUnit || o.receiptRows.some((r) => r.oldUnitPrice > 0), `old=${o.receiptRows[0].oldUnitPrice}`);

  o = mockSetWipMethod("PERCENT_COMPLETED");
  o = mockPatchWipRow(o.wipDetailRows[0].productId, { percentCompleted: 90 });
  o = mockPreviewCosting();
  check("13c preview compare", o.compareRows.length > 0 && o.costPreviewed, `compare=${o.compareRows.length}`);
  const previewUnit = o.aggregateRows[0].unitCost;
  await mockPostCosting();
  o = buildOverview();
  check(
    "13d overwrite",
    o.stepStatuses[3] === "DONE" && o.aggregateRows[0].unitCost === previewUnit && previewUnit !== postedUnit,
    `old=${postedUnit} preview=${previewUnit} new=${o.aggregateRows[0].unitCost}`,
  );

  // step 5/6 still NOT_STARTED — unaffected
  check("14 other steps", o.stepStatuses[4] === "NOT_STARTED" && o.stepStatuses[5] === "NOT_STARTED", o.stepStatuses.join(","));

  o = mockReopenStep(4, "Thu preset dac biet");
  o = mockSetIncompletePreset("id2720_p05");
  check("11b preset", o.incompleteConfig.mode === "incomplete_ValueChange_Calculated_ID2720", o.incompleteConfig.mode);

  console.log("---", tests.filter((t) => t.ok).length + "/" + tests.length, "passed");
  if (tests.some((t) => !t.ok)) process.exit(1);
}

flow().catch((e) => {
  console.error(e);
  process.exit(1);
});
