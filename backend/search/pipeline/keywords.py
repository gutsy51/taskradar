import re
from dataclasses import dataclass
from typing import Final

from libs.ml.preprocessors import Normalizer

WHITESPACE_RE: Final[re.Pattern[str]] = re.compile(r"\s+")
TOKEN_RE: Final[re.Pattern[str]] = re.compile(
    r"""
    \s*(?:
        (?P<left_paren>\() |
        (?P<right_paren>\)) |
        "(?P<quoted>[^"]+)" |
        (?P<operator>\b(?:И|ИЛИ)\b) |
        (?P<term>[^()"]+?(?=\s+\b(?:И|ИЛИ)\b|\s*\(|\s*\)|$))
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


@dataclass(frozen=True, slots=True)
class _KeywordToken:
    kind: str
    value: str


@dataclass(frozen=True, slots=True)
class _KeywordTermNode:
    value: str
    is_exact: bool


@dataclass(frozen=True, slots=True)
class _KeywordBinaryNode:
    operator: str
    left: "KeywordAstNode"
    right: "KeywordAstNode"


KeywordAstNode = _KeywordTermNode | _KeywordBinaryNode


@dataclass(frozen=True, slots=True)
class _CompiledKeywordTermNode:
    exact_value: str
    fuzzy_tokens: tuple[str, ...]
    is_exact: bool


@dataclass(frozen=True, slots=True)
class _CompiledKeywordBinaryNode:
    operator: str
    left: "CompiledKeywordNode"
    right: "CompiledKeywordNode"


CompiledKeywordNode = _CompiledKeywordTermNode | _CompiledKeywordBinaryNode


@dataclass(frozen=True, slots=True)
class _KeywordDocument:
    exact_text: str
    normalized_tokens: frozenset[str]


class KeywordExpressionParser:
    def __init__(self, tokens: list[_KeywordToken]) -> None:
        self.__tokens = tokens
        self.__position = 0

    @classmethod
    def parse(cls, expression: str) -> KeywordAstNode:
        normalized_expression = cls.__compact_spaces(expression)
        if not normalized_expression:
            raise ValueError("Выражение ключевых слов не должно быть пустым")

        tokens = cls.__tokenize(normalized_expression)
        parser = cls(tokens)
        node = parser.__parse_or()

        if parser.__current() is not None:
            raise ValueError(f"Неожиданный токен: {parser.__current()}")

        return node

    @classmethod
    def __tokenize(cls, expression: str) -> list[_KeywordToken]:
        tokens: list[_KeywordToken] = []
        position = 0

        while position < len(expression):
            if not expression[position:].strip():
                break

            match = TOKEN_RE.match(expression, position)
            if match is None or match.lastgroup is None:
                fragment = expression[position : position + 32].strip() or expression[position]
                raise ValueError(f"Не удалось разобрать выражение возле: {fragment}")

            if match.lastgroup == "left_paren":
                tokens.append(_KeywordToken(kind="left_paren", value="("))
            elif match.lastgroup == "right_paren":
                tokens.append(_KeywordToken(kind="right_paren", value=")"))
            elif match.lastgroup == "quoted":
                tokens.append(
                    _KeywordToken(
                        kind="quoted",
                        value=cls.__compact_spaces(match.group("quoted") or ""),
                    )
                )
            elif match.lastgroup == "operator":
                raw_operator = (match.group("operator") or "").upper()
                operator_kind = "and" if raw_operator == "И" else "or"
                tokens.append(_KeywordToken(kind=operator_kind, value=raw_operator))
            elif match.lastgroup == "term":
                tokens.append(
                    _KeywordToken(
                        kind="term",
                        value=cls.__compact_spaces(match.group("term") or ""),
                    )
                )

            position = match.end()

        if not tokens:
            raise ValueError("Выражение ключевых слов не должно быть пустым")

        return tokens

    def __parse_or(self) -> KeywordAstNode:
        node = self.__parse_and()

        while self.__match("or"):
            node = _KeywordBinaryNode(
                operator="or",
                left=node,
                right=self.__parse_and(),
            )

        return node

    def __parse_and(self) -> KeywordAstNode:
        node = self.__parse_primary()

        while self.__match("and"):
            node = _KeywordBinaryNode(
                operator="and",
                left=node,
                right=self.__parse_primary(),
            )

        return node

    def __parse_primary(self) -> KeywordAstNode:
        token = self.__current()
        if token is None:
            raise ValueError("Ожидалось ключевое слово или группа в скобках")

        if token.kind == "left_paren":
            self.__position += 1
            node = self.__parse_or()
            self.__expect("right_paren", "Ожидалась закрывающая скобка")
            return node

        if token.kind == "right_paren":
            raise ValueError("Лишняя закрывающая скобка")

        if token.kind in {"and", "or"}:
            raise ValueError(f"Неожиданный оператор: {token.value}")

        self.__position += 1
        return _KeywordTermNode(value=token.value, is_exact=token.kind == "quoted")

    def __expect(self, kind: str, error_message: str) -> None:
        token = self.__current()
        if token is None or token.kind != kind:
            raise ValueError(error_message)
        self.__position += 1

    def __match(self, kind: str) -> bool:
        token = self.__current()
        if token is None or token.kind != kind:
            return False
        self.__position += 1
        return True

    def __current(self) -> _KeywordToken | None:
        if self.__position >= len(self.__tokens):
            return None
        return self.__tokens[self.__position]

    @staticmethod
    def __compact_spaces(value: str) -> str:
        return WHITESPACE_RE.sub(" ", value).strip()


class KeywordMatcher:
    __normalizer_loaded = False

    def __init__(self, expression: str) -> None:
        if not expression.strip():
            raise ValueError("Выражение ключевых слов не должно быть пустым")

        self.__normalizer = self.__get_normalizer()
        self.__root = self.__compile(KeywordExpressionParser.parse(expression))

    @classmethod
    def validate_expression(cls, expression: str) -> None:
        cls(expression)

    def matches(self, text: str) -> bool:
        document = self.__build_document(text)
        return self.__matches_node(self.__root, document)

    @classmethod
    def __get_normalizer(cls) -> Normalizer:
        if not cls.__normalizer_loaded:
            Normalizer.load()
            cls.__normalizer_loaded = True
        return Normalizer()

    def __build_document(self, text: str) -> _KeywordDocument:
        compact_text = self.__compact_spaces(text).casefold()
        normalized_tokens = frozenset(self.__normalizer.normalize(text))

        return _KeywordDocument(
            exact_text=compact_text,
            normalized_tokens=normalized_tokens,
        )

    def __compile(self, node: KeywordAstNode) -> CompiledKeywordNode:
        if isinstance(node, _KeywordTermNode):
            return self.__compile_term(node)

        return _CompiledKeywordBinaryNode(
            operator=node.operator,
            left=self.__compile(node.left),
            right=self.__compile(node.right),
        )

    def __compile_term(self, node: _KeywordTermNode) -> _CompiledKeywordTermNode:
        exact_value = self.__compact_spaces(node.value).casefold()
        fuzzy_tokens = tuple(dict.fromkeys(self.__normalizer.normalize(node.value)))

        if not node.is_exact and not fuzzy_tokens:
            raise ValueError(
                f"Ключевое слово `{node.value}` не содержит значимых токенов после нормализации"
            )

        return _CompiledKeywordTermNode(
            exact_value=exact_value,
            fuzzy_tokens=fuzzy_tokens,
            is_exact=node.is_exact,
        )

    def __matches_node(self, node: CompiledKeywordNode, document: _KeywordDocument) -> bool:
        if isinstance(node, _CompiledKeywordTermNode):
            return self.__matches_term(node, document)

        if node.operator == "and":
            return self.__matches_node(node.left, document) and self.__matches_node(
                node.right, document
            )

        return self.__matches_node(node.left, document) or self.__matches_node(node.right, document)

    @staticmethod
    def __matches_term(node: _CompiledKeywordTermNode, document: _KeywordDocument) -> bool:
        if node.is_exact:
            return node.exact_value in document.exact_text
        return all(token in document.normalized_tokens for token in node.fuzzy_tokens)

    @staticmethod
    def __compact_spaces(value: str) -> str:
        return WHITESPACE_RE.sub(" ", value).strip()
