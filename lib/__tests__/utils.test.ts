import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-sm", "text-sm", "font-semibold")).toBe("text-sm font-semibold")
  })
})
