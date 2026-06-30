<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// ПОДГОТАВЛИВАЕТ НАВИГАЦИЮ И АДАПТИВНЫЕ ФОНЫ СТРАНИЦЫ 404
const router = useRouter()
const desktopBackground = `${import.meta.env.BASE_URL}images/404-stadium-desktop-v2.png`
const mobileBackground = `${import.meta.env.BASE_URL}images/404-stadium-mobile.png`

// ХРАНИТ ИСХОДНЫЕ META-ДАННЫЕ, ЧТОБЫ ВОССТАНОВИТЬ ИХ ПОСЛЕ УХОДА
let previousTitle = ''
let robotsMeta: HTMLMetaElement | null = null
let previousRobotsContent: string | null = null
let createdRobotsMeta = false

// ВОЗВРАЩАЕТ ПОЛЬЗОВАТЕЛЯ НА КОРНЕВОЙ МАРШРУТ ПРИЛОЖЕНИЯ
const goHome = (): void => {
  void router.push('/')
}

// ЗАПРЕЩАЕТ ИНДЕКСАЦИЮ НЕСУЩЕСТВУЮЩЕГО МАРШРУТА И МЕНЯЕТ ЗАГОЛОВОК
onMounted(() => {
  previousTitle = document.title
  document.title = '404 — Страница не найдена | Футбольный менеджер'

  robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta')
    robotsMeta.name = 'robots'
    document.head.appendChild(robotsMeta)
    createdRobotsMeta = true
  } else {
    previousRobotsContent = robotsMeta.getAttribute('content')
  }

  robotsMeta.content = 'noindex, nofollow'
})

// ВОССТАНАВЛИВАЕТ META-ДАННЫЕ ПРЕДЫДУЩЕЙ СТРАНИЦЫ ПЕРЕД УНИЧТОЖЕНИЕМ
onBeforeUnmount(() => {
  document.title = previousTitle

  if (createdRobotsMeta) {
    robotsMeta?.remove()
  } else if (robotsMeta) {
    if (previousRobotsContent === null) {
      robotsMeta.removeAttribute('content')
    } else {
      robotsMeta.content = previousRobotsContent
    }
  }
})
</script>

<template>
  <main
    class="relative isolate flex min-h-screen items-center overflow-hidden bg-[#07121b] text-[#f4f7f2] max-[1000px]:items-end max-[1000px]:justify-center max-[1000px]:overflow-y-auto max-[1000px]:px-5 max-[1000px]:py-[46px] max-[580px]:px-3 max-[580px]:py-6"
  >
    <!-- ФОНОВОЕ ИЗОБРАЖЕНИЕ -->
    <picture class="absolute inset-0 -z-[2] block overflow-hidden" aria-hidden="true">
      <source
        media="(max-width: 700px), (max-width: 1000px) and (orientation: portrait)"
        :srcset="mobileBackground"
      />
      <img
        :src="desktopBackground"
        alt=""
        class="h-full w-full object-cover object-center max-[1000px]:object-[60%_center]"
      />
    </picture>
    <div
      class="absolute inset-0 -z-[1] bg-[linear-gradient(90deg,rgba(3,11,17,0.47)_0%,rgba(3,11,17,0.12)_55%,rgba(3,11,17,0.15)_100%),linear-gradient(0deg,rgba(1,8,12,0.5),transparent_38%)] max-[1000px]:bg-[linear-gradient(0deg,rgba(3,11,17,0.87),rgba(3,11,17,0.2)_80%)]"
      aria-hidden="true"
    ></div>

    <!-- КАРТОЧКА ОШИБКИ -->
    <section
      class="relative ml-[clamp(32px,7.5vw,116px)] w-[min(47vw,700px)] min-w-[590px] bg-[linear-gradient(135deg,rgba(119,151,146,0.72),rgba(48,65,68,0.72)_44%,rgba(115,145,57,0.68))] p-1 [clip-path:polygon(28px_0,calc(100%_-_28px)_0,100%_28px,100%_calc(100%_-_28px),calc(100%_-_28px)_100%,28px_100%,0_calc(100%_-_28px),0_28px)] [filter:drop-shadow(0_26px_50px_rgba(0,0,0,0.55))] before:absolute before:inset-1 before:-z-[1] before:bg-[linear-gradient(145deg,rgba(13,25,33,0.97),rgba(5,15,22,0.98))] before:[clip-path:inherit] before:content-[''] max-[1000px]:ml-0 max-[1000px]:w-[min(100%,690px)] max-[1000px]:min-w-0 max-[580px]:[clip-path:polygon(18px_0,calc(100%_-_18px)_0,100%_18px,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,18px_100%,0_calc(100%_-_18px),0_18px)]"
      aria-labelledby="not-found-title"
    >
      <div
        class="absolute inset-1 bg-[linear-gradient(30deg,#91b542_1px,transparent_1px),linear-gradient(150deg,#91b542_1px,transparent_1px)] opacity-[0.11] [background-size:28px_48px] [-webkit-mask-image:linear-gradient(90deg,#000,transparent_45%,transparent_67%,#000)] [mask-image:linear-gradient(90deg,#000,transparent_45%,transparent_67%,#000)]"
        aria-hidden="true"
      ></div>
      <i
        class="absolute left-9 top-[3px] z-[3] h-[5px] w-[38px] -skew-x-[35deg] bg-[repeating-linear-gradient(90deg,#a7dc45_0_6px,transparent_6px_9px)] shadow-[0_0_11px_rgba(167,220,69,0.65)]"
        aria-hidden="true"
      ></i>
      <i
        class="absolute bottom-[3px] right-9 z-[3] h-[5px] w-[38px] -skew-x-[35deg] bg-[repeating-linear-gradient(90deg,#a7dc45_0_6px,transparent_6px_9px)] shadow-[0_0_11px_rgba(167,220,69,0.65)]"
        aria-hidden="true"
      ></i>

      <div
        class="relative z-[2] px-[clamp(36px,4vw,66px)] pb-[clamp(30px,5vh,56px)] pt-[clamp(34px,5.3vh,64px)] text-center max-[1000px]:pt-10 max-[580px]:px-5 max-[580px]:pb-7 max-[580px]:pt-[34px]"
      >
        <div
          class="scale-x-[1.04] font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(136px,14.5vw,224px)] leading-[0.77] tracking-[0.035em] text-[#eef0ed] [text-shadow:3px_4px_0_#a1bd70,7px_9px_0_rgba(0,0,0,0.35),0_0_24px_rgba(255,255,255,0.1)] max-[1000px]:text-[clamp(116px,27vw,190px)] max-[580px]:text-[clamp(96px,31vw,146px)]"
          aria-label="Ошибка 404"
        >
          404
        </div>

        <div
          class="mx-auto mb-3 mt-[30px] grid w-[min(88%,470px)] grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-[13px] text-[#a7dc45] max-[580px]:mt-6 max-[580px]:gap-2"
          aria-hidden="true"
        >
          <span class="h-px bg-[linear-gradient(90deg,transparent,rgba(167,220,69,0.8))]"></span>
          <b class="text-[19px] leading-none [text-shadow:0_0_12px_rgba(167,220,69,0.55)]">★</b>
          <b class="text-[19px] leading-none [text-shadow:0_0_12px_rgba(167,220,69,0.55)]">★</b>
          <b class="text-[19px] leading-none [text-shadow:0_0_12px_rgba(167,220,69,0.55)]">★</b>
          <span class="h-px bg-[linear-gradient(90deg,rgba(167,220,69,0.8),transparent)]"></span>
        </div>

        <h1
          id="not-found-title"
          class="m-0 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(34px,3.2vw,52px)] uppercase leading-[1.08] tracking-[0.055em] text-[#a7dc45] [text-shadow:0_0_18px_rgba(167,220,69,0.2)] max-[580px]:text-[clamp(29px,8.4vw,38px)]"
        >
          Не попал в створ
        </h1>
        <p
          class="mx-auto mb-0 mt-[18px] text-[clamp(17px,1.45vw,22px)] leading-[1.38] text-[#c8ced0] max-[580px]:text-base"
        >
          Похоже, эта страница пробила мимо ворот.<br />
          Вернёмся в игру?
        </p>

        <div class="mt-8 flex justify-center max-[580px]:mt-[26px]">
          <button
            class="flex min-h-[58px] w-[min(100%,330px)] cursor-pointer items-center justify-center gap-[15px] border border-[#c8f37a] bg-[linear-gradient(105deg,#375918,#6fa62b_58%,#3c631b)] font-[Arial,sans-serif] text-[18px] font-bold leading-none text-[#eef3ef] shadow-[inset_0_0_18px_rgba(199,255,107,0.22),0_0_18px_rgba(150,211,61,0.4)] transition-[transform,filter,background-color] duration-[160ms] [clip-path:polygon(12px_0,100%_0,100%_calc(100%_-_12px),calc(100%_-_12px)_100%,0_100%,0_12px)] hover:-translate-y-0.5 hover:brightness-[1.12] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            type="button"
            @click="goHome"
          >
            <svg
              class="h-[23px] w-[23px] shrink-0 text-[#f4f5f0] [filter:drop-shadow(0_2px_2px_rgba(0,0,0,0.42))]"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="14" fill="currentColor" />
              <path
                d="m16 8 4.6 3.4-1.8 5.4h-5.6l-1.8-5.4L16 8Zm-7.8 8.2 5 3.7-1.9 5.7-5.1-3.8 2-5.6Zm15.6 0 2 5.6-5.1 3.8-1.9-5.7 5-3.7Z"
                fill="#111820"
              />
            </svg>
            <span>На главную</span>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
