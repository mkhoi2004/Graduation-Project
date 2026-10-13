import { Decimal } from 'decimal.js';
const ExactDecimal = Decimal.clone({ precision: 80 });
function money(value) {
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
        throw new Error('Số tiền phải là chuỗi thập phân hợp lệ.');
    return new ExactDecimal(value);
}
export function netPayable(lines, roundingAdjustment) {
    let result = money(roundingAdjustment);
    for (const line of lines) {
        const quantity = money(line.quantity);
        const price = money(line.unitPrice);
        const discount = money(line.discount);
        const tax = money(line.tax);
        if (quantity.lte(0) || price.lt(0) || discount.lt(0) || discount.gt(quantity.mul(price)) || tax.lt(0))
            throw new Error('Dòng dịch vụ có số tiền không hợp lệ.');
        result = result.plus(quantity.mul(price).minus(discount).plus(tax));
    }
    if (result.lt(0))
        throw new Error('Tổng thanh toán không thể âm.');
    return result.toFixed();
}
export function validateAllocation(net, patient, insurer) {
    const values = [money(net), money(patient), money(insurer)];
    if (values.some(value => value.lt(0)) || !values[1].plus(values[2]).eq(values[0]))
        throw new Error('Phân bổ người chi trả không bằng tổng thanh toán.');
}
export function outstanding(allocation, confirmed, advance, credit, refunded) {
    const [a, p, d, c, r] = [allocation, confirmed, advance, credit, refunded].map(money);
    if ([a, p, d, c, r].some(value => value.lt(0)) || r.gt(p) || p.plus(d).plus(c).minus(r).gt(a))
        throw new Error('Giá trị thanh toán hoặc hoàn tiền vượt mức hợp lệ.');
    return a.minus(p).minus(d).minus(c).plus(r).toFixed();
}
