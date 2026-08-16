/*
 * 正誤の効果音。音声ファイルは持たず、Web Audio でその場で作る。
 *
 * 「ピンポーン」は高い音から少し下がる2音、「ブッブー」は低い音を2回。
 * どちらも身のまわりで聞き慣れた形なので、文字を読まなくても結果が分かる。
 *
 * ファイルを置かないのは、数十 KB の音源2つを読み込むより速く、
 * 音量や高さをコードから調整できるため。
 */

type Tone = {
  /** 音の高さ（Hz） */
  frequency: number
  /** 鳴らし始めてから何秒後に出すか */
  startAt: number
  /** 鳴っている長さ（秒） */
  duration: number
}

/** ピンポーン。ミ→ド と下がる。玄関のチャイムと同じ動き */
const CORRECT_TONES: Tone[] = [
  { frequency: 1318.5, startAt: 0, duration: 0.18 },
  { frequency: 1046.5, startAt: 0.16, duration: 0.5 },
]

/** ブッブー。低いまま2回。2回目を長く伸ばす */
const WRONG_TONES: Tone[] = [
  { frequency: 165, startAt: 0, duration: 0.16 },
  { frequency: 155, startAt: 0.2, duration: 0.36 },
]

/*
 * 波の形。
 * 正解はやわらかい音（sine）、不正解はブザーらしい濁った音（square）。
 */
const CORRECT_WAVE: OscillatorType = 'sine'
const WRONG_WAVE: OscillatorType = 'square'

/** square は sine より耳につくので、音量を下げてつり合わせる */
const CORRECT_VOLUME = 0.18
const WRONG_VOLUME = 0.1

/** 音の立ち上がりにかける時間。0 だとプツッというノイズが乗る */
const ATTACK = 0.015

/**
 * 無音のかわりに使う値。
 * 音量を 0 に向かって滑らかに下げる exponentialRamp は 0 を受け付けないため、
 * 聞こえない大きさで代用する。
 */
const SILENT = 0.0001

let context: AudioContext | null = null

/**
 * 音を出す土台を用意する。
 *
 * ブラウザは、利用者が何か操作するまで音を鳴らさない決まりになっている。
 * この関数は答えを選んだ直後にしか呼ばれないので、その場で起こせる。
 * 音を出せない環境（古いブラウザ、音声が禁止された設定）では null を返し、
 * 呼び出し側は何もしない。音が出ないだけでクイズは続けられる。
 */
function audioContext(): AudioContext | null {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  tone: Tone,
  wave: OscillatorType,
  volume: number,
): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = wave
  oscillator.frequency.value = tone.frequency

  const start = ctx.currentTime + tone.startAt
  gain.gain.setValueAtTime(SILENT, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + ATTACK)
  gain.gain.exponentialRampToValueAtTime(SILENT, start + tone.duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  // 鳴り終わってから止める。ぴったりで止めると最後が切れて聞こえる
  oscillator.stop(start + tone.duration + 0.05)
}

export function playResultSound(correct: boolean): void {
  const ctx = audioContext()
  if (!ctx) return

  const tones = correct ? CORRECT_TONES : WRONG_TONES
  const wave = correct ? CORRECT_WAVE : WRONG_WAVE
  const volume = correct ? CORRECT_VOLUME : WRONG_VOLUME

  for (const tone of tones) playTone(ctx, tone, wave, volume)
}
