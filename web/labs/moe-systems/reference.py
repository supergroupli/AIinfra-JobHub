"""Reference solution: read after attempting exercises.py / 尝试后再读。"""


def stable_topk(scores, k):
    return sorted(range(len(scores)), key=lambda i: (-scores[i], i))[:k]


def weighted_combine(token_count, width, rows):
    result = [[0.0] * width for _ in range(token_count)]
    for token, weight, vector in rows:
        for column in range(width):
            result[token][column] += weight * vector[column]
    return result
