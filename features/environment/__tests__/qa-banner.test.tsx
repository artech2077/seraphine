import { render, screen, within } from "@testing-library/react"

import { QaBanner } from "@/components/layout/qa-banner"

describe("QaBanner", () => {
  it("renders a QA banner in the QA environment", () => {
    render(<QaBanner environment="qa" />)

    const alert = screen.getByRole("alert")

    expect(within(alert).getByText("QA")).toBeInTheDocument()
    expect(within(alert).getAllByText(/QA environment/i).length).toBeGreaterThan(0)
  })

  it("renders nothing outside QA", () => {
    const { container } = render(<QaBanner environment="production" />)

    expect(container).toBeEmptyDOMElement()
  })
})
