import { Fragment } from 'react'
import { splitFurigana } from './furigana.ts'

/*
 * 文字列にふりがなを付けて出す。
 *
 *   <Furi>都市をえらぶ</Furi>
 *   → 「<ruby>都市<rt>とし</rt></ruby>をえらぶ」
 *
 * 出し入れは CSS がやる。ここは常に <rt> を出しておき、
 * ルート要素の data-furi に合わせて表示だけ切り替える。
 * こうしておくと、トグルしても文字列を組み直す処理は 1 度も走らない。
 *
 * 受け取れるのは文字列 1 つだけにしてある。<Furi>都市{n}件</Furi> のように
 * 書けてしまうと、間に入った値までふりがなを探しに行くことになり、
 * 数字や記号で切れた文が思わぬ読みになる。分けて書いてもらう。
 */

type Props = {
  children: string
}

function Furi({ children }: Props) {
  return (
    /*
     * 全体を span 1 つで包む。ここを Fragment にしてはいけない。
     *
     * ふりがなを付けると、1 つの文が <ruby> と地の文に分かれる。
     * 包まずに display: flex の中へ置くと、その断片ひとつひとつが
     * 別々の項目として並べられてしまう。justify-content: space-between なら
     * 「アメリカ」と「合衆国」が左右の端まで引き離される。
     *
     * span は行の中では何もしないので、包んでも文字の折り返しは変わらない。
     */
    <span>
      {splitFurigana(children).map((segment, index) =>
        segment.yomi === null ? (
          // 同じ文字列からは同じ並びしかできないので、位置を鍵にしてよい
          <Fragment key={index}>{segment.text}</Fragment>
        ) : (
          <ruby key={index}>
            {segment.text}
            <rt>{segment.yomi}</rt>
          </ruby>
        ),
      )}
    </span>
  )
}

export default Furi
