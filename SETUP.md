# تشغيل نظام العيادة على GitHub

اللينك: `https://karimelshourbagy1.github.io/clinic/`

الكود بس هو اللي على GitHub. البيانات (المرضى والحسابات والصور) محفوظة في Firebase على حسابك، ومحدش يقدر يفتحها غير الإيميل بتاعك.

## 1. Firebase (مرة واحدة)
1. ادخل https://console.firebase.google.com واعمل **Add project** (سيب Google Analytics مقفول).
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. في نفس الصفحة: **Users → Add user**، واكتب الإيميل وكلمة السر اللي هتدخل بيهم.
4. **Settings → User actions**: اقفل **Enable create (sign-up)** عشان محدش غيرك يقدر يعمل حساب.
5. **Authentication → Settings → Authorized domains → Add domain**: `karimelshourbagy1.github.io`.
6. **Build → Firestore Database → Create database** (اختار أقرب منطقة، مثلًا `europe-west`، و Production mode).
7. **Firestore → Rules**: الصق محتوى ملف `firestore.rules`، وغيّر `YOUR_EMAIL@gmail.com` للإيميل بتاعك، واضغط **Publish**.
8. **Project settings (الترس) → Your apps → Web (</>)**: سجّل app، وانسخ قيم `firebaseConfig` وابعتهالي أو حطها في `config.js`.

## 2. نقل البيانات من النظام القديم
1. افتح النظام الحالي: **الإعدادات → اعرض نسخة احتياطية**، وانسخ النص كله.
2. افتح اللينك الجديد وسجّل دخول: **الإعدادات → استرجاع من نسخة**، الصق النص، **وعلّم على الأسعار/الكتالوج كمان** (عشان الخدمات والأسعار تتنقل)، واضغط استرجاع.
3. من وقتها اشتغل على اللينك الجديد بس.

## 3. المساعد الذكي (DeepSeek)
DeepSeek API **مش مجاني**. بيتحسب بالاستهلاك، بس رخيص جدًا (أقل من عُشر سنت للسؤال تقريبًا).
1. اعمل حساب على https://platform.deepseek.com، واشحن رصيد صغير (2 أو 3 دولار)، واعمل **API key**.
2. اعمل حساب مجاني على https://dash.cloudflare.com ← **Workers & Pages → Create → Worker**، والصق محتوى `worker/deepseek-worker.js` واعمل **Deploy**.
3. من **Settings → Variables and Secrets** للـ Worker ضيف:
   - `DEEPSEEK_KEY` (نوعه **Secret**): المفتاح بتاع DeepSeek
   - `FIREBASE_PROJECT`: الـ projectId بتاع Firebase
   - `ALLOWED_EMAILS`: الإيميل بتاعك
   - `ALLOWED_ORIGIN`: `https://karimelshourbagy1.github.io`
4. انسخ لينك الـ Worker (شبه `https://xxx.workers.dev`) وحطه في `aiUrl` في `config.js`.

المفتاح بتاع DeepSeek **مايتحطش في GitHub ولا في أي ملف**. مكانه الوحيد هو الـ Secret في Cloudflare.

ملحوظات:
- رد المساعد اقتراح بيساعدك، **مش تشخيص**. القرار في الآخر بتاعك.
- النظام بيبعتله السن والجنس والشكوى والتاريخ المرضي والتشخيص المبدئي بس، **من غير اسم**. وأي رقم تليفون في النص بيتشال تلقائي قبل ما يتبعت.

## 4. تسجيل الخروج
من **الإعدادات ← تسجيل خروج**. بيمسح البيانات من الجهاز ده بس، وكل حاجة بتفضل محفوظة في حسابك. لو بتفتح النظام من جهاز في المركز، اعمل خروج دايمًا قبل ما تقوم.
