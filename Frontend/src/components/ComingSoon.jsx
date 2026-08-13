import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '../assets/TorchX.svg'

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  .cs-display {
    font-family: 'Sora', sans-serif;
  }

  .cs-body {
    font-family: 'DM Sans', sans-serif;
  }

  .cs-ui {
    font-family: 'Instrument Sans', sans-serif;
  }
`

// Product-specific taglines
const PRODUCT_COPY = {
  Engage:
    'A space for recognition, pulse surveys, and the moments that keep teams connected.',

  Finance:
    'Invoicing, expense tracking, and ledgers built to sit right alongside your HR data.',

  Inventory:
    'Asset and stock tracking that stays in sync with the people using it.',

  Payroll:
    'Automated payroll runs, payslips, and compliance — without the spreadsheet juggling.',
}

// Different color for every letter
const LETTER_COLORS = [
  '#7A004B',
  '#CD166E',
  '#F2794F',
  '#5A0033',
  '#B85A86',
  '#FF9457',
  '#7A004B',
  '#CD166E',
  '#F2794F',
  '#EB002B',
]

// Floating balls
const BALLS = [
  {
    size: 130,
    top: '10%',
    left: '8%',
    from: '#FFB877',
    to: '#F2794F',
    xr: 22,
    yr: 30,
    dur: 9,
  },
  {
    size: 70,
    top: '18%',
    left: '82%',
    from: '#B85A86',
    to: '#7A004B',
    xr: 18,
    yr: 24,
    dur: 7.5,
    delay: 0.6,
  },
  {
    size: 46,
    top: '68%',
    left: '88%',
    from: '#FFD08A',
    to: '#FF9457',
    xr: 16,
    yr: 20,
    dur: 6.5,
    delay: 1.1,
  },
  {
    size: 96,
    top: '72%',
    left: '6%',
    from: '#7A004B',
    to: '#CD166E',
    xr: 20,
    yr: 26,
    dur: 10,
    delay: 0.3,
  },
  {
    size: 34,
    top: '38%',
    left: '92%',
    from: '#F2794F',
    to: '#FFB877',
    xr: 14,
    yr: 18,
    dur: 5.5,
    delay: 1.6,
  },
  {
    size: 58,
    top: '84%',
    left: '48%',
    from: '#CD166E',
    to: '#B85A86',
    xr: 18,
    yr: 22,
    dur: 8,
    delay: 0.9,
  },
  {
    size: 26,
    top: '6%',
    left: '46%',
    from: '#FFD08A',
    to: '#CD166E',
    xr: 12,
    yr: 16,
    dur: 5,
    delay: 0.2,
  },
]

function FloatingBalls() {
  return (
    <>
      {BALLS.map((b, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="
            absolute
            rounded-full
            pointer-events-none
          "
          style={{
            width: `clamp(${Math.max(b.size * 0.45, 18)}px, ${b.size / 2}px, ${b.size}px)`,
            height: `clamp(${Math.max(b.size * 0.45, 18)}px, ${b.size / 2}px, ${b.size}px)`,
            top: b.top,
            left: b.left,
            background: `radial-gradient(
              circle at 35% 30%,
              ${b.from} 0%,
              ${b.to} 75%
            )`,
            boxShadow: `
              0 ${b.size / 5}px
              ${b.size / 2}px
              -${b.size / 8}px
              rgba(122, 0, 75, 0.35)
            `,
          }}
          animate={{
            x: [0, b.xr, -b.xr, 0],
            y: [0, -b.yr, b.yr, 0],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay || 0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  )
}

export default function ComingSoon() {
  const [params] = useSearchParams()

  const product = params.get('product')

  const blurb =
    PRODUCT_COPY[product] ||
    "We're putting the final touches on something fresh, bold, and built to give you an edge."

  const title = 'COMING SOON'

  return (
    <div
      className="
        min-h-[100svh]
        bg-[#EFE6F2]
        relative
        overflow-x-hidden
        overflow-y-hidden
        cs-body
      "
    >
      <style>{fontStyles}</style>

      {/* Floating colorful balls */}
      <FloatingBalls />

      <div className="relative z-10 flex flex-col min-h-[100svh]">

        {/* ================= HEADER ================= */}
        <header
          className="
            flex
            items-center
            justify-between

            px-4
            py-5

            sm:px-8
            sm:py-6

            md:px-10

            lg:px-14
            lg:py-7

            xl:px-16
          "
        >
          <img
            src={logo}
            alt="TorchX"
            className="
              h-7
              w-auto

              sm:h-8

              md:h-9

              lg:h-10
            "
          />

          <Link
            to="/"
            className="
              cs-ui
              text-xs
              font-semibold
              text-[#7A004B]

              underline
              underline-offset-4
              decoration-[#7A004B]/50

              hover:text-[#5A0033]

              transition-colors
              duration-200

              sm:text-sm

              md:text-base
            "
          >
            Home
          </Link>
        </header>

        {/* ================= MAIN ================= */}
        <main
          className="
            flex-1
            flex
            flex-col
            justify-center

            px-4

            sm:px-8

            md:px-10

            lg:px-14

            xl:px-16
          "
        >

          {/* ================= COMING SOON ================= */}
         <motion.h1
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    duration: 0.5,
    ease: 'easeOut',
  }}
  className="
    cs-display
    font-black
    leading-[0.88]
    text-center
    tracking-[-0.055em]
    select-none
    w-full
    mx-auto

    text-[18vw]

    sm:text-[11vw]
    md:text-[10vw]
    lg:text-[8.5vw]
    xl:text-[8vw]
    2xl:text-[7.5vw]
  "
>
  {/* COMING */}
  <span className="block whitespace-nowrap">
    {'COMING'.split('').map((letter, index) => (
      <motion.span
        key={`coming-${index}`}
        className="inline-block"
        style={{
          color: LETTER_COLORS[index],
        }}
        initial={{
          opacity: 0,
          y: 30,
          scale: 0.92,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.45,
          delay: index * 0.07,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{
          y: -8,
          scale: 1.04,
        }}
      >
        {letter}
      </motion.span>
    ))}
  </span>

  {/* SOON */}
 <span className="block whitespace-nowrap sm:inline-block">
    {'SOON'.split('').map((letter, index) => (
      <motion.span
        key={`soon-${index}`}
        className="inline-block"
        style={{
          color: LETTER_COLORS[index + 6],
        }}
        initial={{
          opacity: 0,
          y: 30,
          scale: 0.92,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.45,
          delay: (index + 6) * 0.07,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{
          y: -8,
          scale: 1.04,
        }}
      >
        {letter}
      </motion.span>
    ))}
  </span>
</motion.h1>
          {/* ================= PRODUCT MESSAGE ================= */}
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
              delay: 0.9,
              ease: 'easeOut',
            }}
            className="
              w-full
              mx-auto

              flex
              flex-col
              items-center
              text-center

              gap-2

              mt-6

              sm:mt-7
              sm:gap-3

              md:mt-8

              lg:mt-9

              max-w-[90vw]
              sm:max-w-[650px]
              lg:max-w-[700px]
            "
          >
            {/* Product Heading */}
            <h2
              className="
                cs-display
                font-extrabold
                text-[#7A004B]
                leading-tight

                text-base

                sm:text-xl

                md:text-2xl

                lg:text-2xl
              "
            >
              {product ? (
                <>
                  {product.toUpperCase()} IS ON ITS WAY
                </>
              ) : (
                <>A BRIGHT NEW LAUNCH IS ON THE WAY</>
              )}
            </h2>

            {/* Description */}
            <p
              className="
                cs-body
                text-[#7A004B]/90
                leading-relaxed

                text-xs
                max-w-[320px]

                sm:text-sm
                sm:max-w-[400px]

                md:text-base
                md:max-w-[440px]
              "
            >
              {blurb}
            </p>
          </motion.div>
        </main>

        {/* ================= BOTTOM SPACING ================= */}
        <div
          className="
            h-[18vh]

            sm:h-[20vh]

            md:h-[21vh]

            lg:h-[22vh]
          "
        />
      </div>
    </div>
  )
}