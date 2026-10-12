using Graduation.Api.Models;

namespace Graduation.Api.Services;

public static class BillingCalculator
{
    public static decimal NetPayable(IEnumerable<BillLine> lines, decimal roundingAdjustment)
    {
        decimal result = roundingAdjustment;
        foreach (var line in lines)
        {
            if (line.Quantity <= 0 || line.UnitPrice < 0 || line.Discount < 0 ||
                line.Discount > line.Quantity * line.UnitPrice || line.Tax < 0)
                throw new ArgumentException("Dòng dịch vụ có số tiền không hợp lệ.");
            result += line.Quantity * line.UnitPrice - line.Discount + line.Tax;
        }
        if (result < 0) throw new ArgumentException("Tổng thanh toán không thể âm.");
        return result;
    }

    public static void ValidateAllocation(decimal netPayable, decimal patientAllocation, decimal bhtmAllocation)
    {
        if (netPayable < 0 || patientAllocation < 0 || bhtmAllocation < 0 ||
            patientAllocation + bhtmAllocation != netPayable)
            throw new ArgumentException("Phân bổ người chi trả không bằng tổng thanh toán.");
    }

    public static decimal Outstanding(decimal allocation, decimal confirmedPayment, decimal appliedAdvance,
        decimal postedCredit, decimal refundedAmount)
    {
        if (allocation < 0 || confirmedPayment < 0 || appliedAdvance < 0 || postedCredit < 0 || refundedAmount < 0 ||
            refundedAmount > confirmedPayment || confirmedPayment + appliedAdvance + postedCredit - refundedAmount > allocation)
            throw new ArgumentException("Giá trị thanh toán hoặc hoàn tiền vượt mức hợp lệ.");
        return allocation - confirmedPayment - appliedAdvance - postedCredit + refundedAmount;
    }
}
