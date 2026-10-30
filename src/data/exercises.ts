import type { AnimationId } from '../three/animations';

export type Place = 'home' | 'gym';
export type Level = 'beginner' | 'intermediate';
export type Focus = 'legs' | 'push' | 'pull' | 'core' | 'cardio';

export type Exercise = {
  id: string;
  name: string;
  focus: Focus;
  /** Where it can be done: home exercises also work in the gym. */
  places: Place[];
  levels: Level[];
  /** Reps per set, or seconds when `timed` is true. */
  amount: number;
  timed?: boolean;
  animation: AnimationId;
  /** Skeleton bones whose muscles light up in the 3D view. */
  muscles: string[];
  steps: string[];
  mistakes: string[];
  avoidIf?: string;
};

const LEGS = ['Hips', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'];

export const EXERCISES: Exercise[] = [
  {
    id: 'squat',
    name: 'Приседания',
    focus: 'legs',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 15,
    animation: 'squat',
    muscles: LEGS,
    steps: [
      'Ноги на ширине плеч, носки чуть в стороны.',
      'Отводи таз назад, как будто садишься на стул.',
      'Опускайся, пока бёдра не станут параллельны полу.',
      'Встань, толкаясь пятками.',
    ],
    mistakes: ['Колени заваливаются внутрь', 'Пятки отрываются от пола', 'Круглая спина'],
    avoidIf: 'Острая боль в коленях',
  },
  {
    id: 'lunge',
    name: 'Выпады',
    focus: 'legs',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 10,
    animation: 'lunge',
    muscles: LEGS,
    steps: [
      'Встань прямо, руки на поясе.',
      'Сделай широкий шаг вперёд.',
      'Опусти заднее колено почти до пола.',
      'Вернись назад и поменяй ногу.',
    ],
    mistakes: ['Переднее колено уходит за носок', 'Корпус наклоняется вперёд'],
  },
  {
    id: 'glute-bridge',
    name: 'Ягодичный мост',
    focus: 'legs',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 15,
    animation: 'bridge',
    muscles: ['Hips', 'LeftUpLeg', 'RightUpLeg'],
    steps: [
      'Ляг на спину, ноги согнуты, стопы на полу.',
      'Подними таз, сжимая ягодицы.',
      'Задержись на секунду наверху.',
      'Медленно опустись.',
    ],
    mistakes: ['Прогиб в пояснице вместо работы ягодиц'],
  },
  {
    id: 'pushup',
    name: 'Отжимания',
    focus: 'push',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 10,
    animation: 'pushup',
    muscles: ['Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'],
    steps: [
      'Упор лёжа, руки чуть шире плеч.',
      'Тело прямое, как доска.',
      'Опустись грудью почти до пола.',
      'Выжми себя вверх.',
    ],
    mistakes: ['Таз провисает', 'Локти разведены в стороны под 90°'],
    avoidIf: 'Боль в запястьях: делай с колен',
  },
  {
    id: 'shoulder-press',
    name: 'Жим над головой',
    focus: 'push',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 12,
    animation: 'shoulderPress',
    muscles: ['LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'],
    steps: [
      'Возьми гантели (дома подойдут бутылки с водой).',
      'Подними их к плечам, локти под кистями.',
      'Выжми вверх над головой.',
      'Медленно опусти к плечам.',
    ],
    mistakes: ['Прогиб в пояснице', 'Рывки корпусом'],
  },
  {
    id: 'biceps-curl',
    name: 'Сгибания на бицепс',
    focus: 'pull',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 12,
    animation: 'curl',
    muscles: ['LeftArm', 'RightArm'],
    steps: [
      'Гантели в руках, локти прижаты к телу.',
      'Согни руки, поднимая гантели к плечам.',
      'Медленно опусти.',
    ],
    mistakes: ['Локти уходят вперёд', 'Раскачивание корпусом'],
  },
  {
    id: 'bent-row',
    name: 'Тяга в наклоне',
    focus: 'pull',
    places: ['gym'],
    levels: ['intermediate'],
    amount: 12,
    animation: 'row',
    muscles: ['Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'],
    steps: [
      'Наклонись вперёд с прямой спиной, колени чуть согнуты.',
      'Гантели или штанга в опущенных руках.',
      'Тяни вес к поясу, сводя лопатки.',
      'Медленно опусти.',
    ],
    mistakes: ['Круглая спина', 'Тяга руками без лопаток'],
    avoidIf: 'Боль в пояснице',
  },
  {
    id: 'plank',
    name: 'Планка',
    focus: 'core',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 30,
    timed: true,
    animation: 'plank',
    muscles: ['Spine', 'Spine1', 'Hips'],
    steps: [
      'Упор на предплечья и носки.',
      'Тело прямое от головы до пяток.',
      'Втяни живот и дыши ровно.',
    ],
    mistakes: ['Таз поднят слишком высоко', 'Провисшая поясница'],
  },
  {
    id: 'crunch',
    name: 'Скручивания',
    focus: 'core',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 15,
    animation: 'crunch',
    muscles: ['Spine', 'Spine1'],
    steps: [
      'Ляг на спину, ноги согнуты.',
      'Руки у висков, не тяни голову.',
      'Подними лопатки от пола, напрягая пресс.',
      'Медленно опустись.',
    ],
    mistakes: ['Тянешь себя руками за шею'],
  },
  {
    id: 'jumping-jacks',
    name: 'Прыжки «звёздочка»',
    focus: 'cardio',
    places: ['home', 'gym'],
    levels: ['beginner', 'intermediate'],
    amount: 30,
    timed: true,
    animation: 'jumpingJack',
    muscles: [...LEGS, 'LeftShoulder', 'RightShoulder'],
    steps: [
      'Встань прямо, руки вдоль тела.',
      'В прыжке разведи ноги и подними руки над головой.',
      'В прыжке вернись в начальное положение.',
    ],
    mistakes: ['Приземление на прямые ноги'],
    avoidIf: 'Проблемы с суставами ног: шагай вместо прыжков',
  },
  {
    id: 'march',
    name: 'Шаг на месте',
    focus: 'cardio',
    places: ['home', 'gym'],
    levels: ['beginner'],
    amount: 60,
    timed: true,
    animation: 'march',
    muscles: LEGS,
    steps: ['Шагай на месте, высоко поднимая колени.', 'Помогай себе руками.'],
    mistakes: ['Сутулишься'],
  },
];

export const WARMUP_ID = 'march';

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
