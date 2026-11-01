import type { SportIconName } from '../ui';

/**
 * Ready-made skills for the "any skill in 20 hours" method:
 * 1) break the skill into parts, most important first,
 * 2) learn just enough theory to notice your own mistakes,
 * 3) remove distractions before each practice,
 * 4) put in 20 hours of focused practice.
 */
export type SkillPreset = {
  id: string;
  name: string;
  icon: SportIconName;
  /** Parts of the skill, the most important first. */
  parts: string[];
  /** The minimum to learn before practising: enough to correct yourself. */
  basics: string[];
};

export const CUSTOM_SKILL_ID = 'custom';

export const SKILL_PRESETS: SkillPreset[] = [
  {
    id: 'guitar',
    name: 'Гитара',
    icon: 'guitar-acoustic',
    parts: ['Основные аккорды', 'Смена аккордов', 'Ритм и бой', 'Перебор', 'Первая песня целиком'],
    basics: ['Настрой гитару по тюнеру', 'Как ставить пальцы, чтобы струны не дребезжали', 'Четыре аккорда: Am, C, G, Em'],
  },
  {
    id: 'english',
    name: 'Английский',
    icon: 'translate',
    parts: ['Самые частые слова', 'Понимать на слух', 'Говорить вслух', 'Базовая грамматика', 'Чтение простых текстов'],
    basics: ['100 самых частых слов', 'Present, Past и Future Simple', 'Медленные подкасты с субтитрами'],
  },
  {
    id: 'drawing',
    name: 'Рисование',
    icon: 'palette',
    parts: ['Линии и простые формы', 'Пропорции', 'Свет и тень', 'Перспектива', 'Рисунок с натуры'],
    basics: ['Как держать карандаш для ровной линии', 'Куб, шар и цилиндр', 'Откуда падает свет и где тень'],
  },
  {
    id: 'coding',
    name: 'Кодинг',
    icon: 'code-braces',
    parts: ['Переменные и условия', 'Циклы и функции', 'Маленькие задачи', 'Читать ошибки', 'Свой мини-проект'],
    basics: ['Как запустить первую программу', 'Что такое переменная, условие и цикл', 'Как читать текст ошибки'],
  },
  {
    id: 'piano',
    name: 'Фортепиано',
    icon: 'piano',
    parts: ['Ноты и клавиатура', 'Аккорды левой рукой', 'Мелодия правой рукой', 'Две руки вместе', 'Простая песня целиком'],
    basics: ['Где нота «до» на клавиатуре', 'Постановка руки и номера пальцев', 'Мажорный аккорд из трёх нот'],
  },
  {
    id: 'chess',
    name: 'Шахматы',
    icon: 'chess-knight',
    parts: ['Тактика: вилки и связки', 'Принципы дебюта', 'Простые эндшпили', 'Разбор своих партий', 'Игра с соперником'],
    basics: ['Как ходят фигуры, рокировка, мат', 'Три правила дебюта: центр, фигуры, король', 'Как разбирать партию после игры'],
  },
];

export function getPreset(id: string): SkillPreset | undefined {
  return SKILL_PRESETS.find((p) => p.id === id);
}
