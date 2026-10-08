import { describe, expect, it } from "vitest";
import { bordaPoints, leaderIds, pickWinner } from "./results";

/** Builds a ballot from book ids in preference order (first = rank 1) */
function ballot(...bookIds: number[]) {
  return {
    ranks: bookIds.map((bookOptionId, i) => ({ bookOptionId, rank: i + 1 })),
  };
}

describe("bordaPoints", () => {
  it("gives N points for rank 1, N-1 for rank 2, and so on", () => {
    const points = bordaPoints([1, 2, 3], [ballot(1, 2, 3)]);
    expect(points).toEqual(
      new Map([
        [1, 3],
        [2, 2],
        [3, 1],
      ]),
    );
  });

  it("adds up points across ballots", () => {
    const points = bordaPoints(
      [1, 2, 3],
      [ballot(1, 2, 3), ballot(2, 1, 3), ballot(2, 3, 1)],
    );
    // 1: 3+2+1, 2: 2+3+3, 3: 1+1+2
    expect(points).toEqual(
      new Map([
        [1, 6],
        [2, 8],
        [3, 4],
      ]),
    );
  });

  it("gives every book 0 when nobody has voted", () => {
    expect(bordaPoints([1, 2], [])).toEqual(
      new Map([
        [1, 0],
        [2, 0],
      ]),
    );
  });

  it("handles a single book", () => {
    expect(bordaPoints([7], [ballot(7), ballot(7)])).toEqual(new Map([[7, 2]]));
  });
});

describe("leaderIds", () => {
  const byScore = (items: { id: number; score: number }[]) =>
    leaderIds(items, (i) => i.score);

  it("returns the single top scorer", () => {
    expect(
      byScore([
        { id: 1, score: 5 },
        { id: 2, score: 3 },
      ]),
    ).toEqual([1]);
  });

  it("returns every option tied for first", () => {
    expect(
      byScore([
        { id: 1, score: 5 },
        { id: 2, score: 5 },
        { id: 3, score: 2 },
      ]),
    ).toEqual([1, 2]);
  });

  it("treats all options as tied when every score is 0", () => {
    expect(
      byScore([
        { id: 1, score: 0 },
        { id: 2, score: 0 },
      ]),
    ).toEqual([1, 2]);
  });

  it("returns nothing when there are no options", () => {
    expect(byScore([])).toEqual([]);
  });
});

describe("pickWinner", () => {
  it("picks the sole leader without a tie-break", () => {
    expect(pickWinner([4], undefined)).toEqual({ id: 4 });
  });

  it("accepts a tie-break that names the sole leader", () => {
    expect(pickWinner([4], 4)).toEqual({ id: 4 });
  });

  it("rejects a tie-break when there's no tie", () => {
    expect(pickWinner([4], 5)).toEqual({ error: "there's no tie to break" });
  });

  it("requires a tie-break when options are tied", () => {
    expect(pickWinner([4, 5], undefined)).toHaveProperty("error");
  });

  it("uses the host's choice when it's one of the tied options", () => {
    expect(pickWinner([4, 5], 5)).toEqual({ id: 5 });
  });

  it("rejects a choice that isn't one of the tied options", () => {
    expect(pickWinner([4, 5], 6)).toHaveProperty("error");
  });

  it("fails when there are no options at all", () => {
    expect(pickWinner([], undefined)).toHaveProperty("error");
  });
});
