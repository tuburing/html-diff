/**
 * 判断是否是结尾符
 * @param char 输入字符串
 * @returns 返回验证结果
 */
export const isEndOfTag = function (char: string) {
    return char === ">";
};
/**
 * 判断是否是开始符
 * @param char 输入字符串
 * @returns 返回验证结果
 */
export const isStartOfTag = function (char: string) {
    return char === "<";
};
/**
 * 判断是否是空格
 * @param char 输入字符串
 * @returns 返回验证结果
 */
export const isWhitespace = function (char: string) {
    return /^\s+$/.test(char);
};

/**
 * 判断是否是Html标签
 * @param html 输入标签
 * @returns 返回验证结果
 */
export const isTag = function (html: string) {
    return /^\s*<[^>]+>\s*$/.test(html);
};

export const isNotTag = function (html: string) {
    return !isTag(html);
};