import { Telegraf, Context, Scenes, session, MiddlewareFn, Markup } from 'telegraf';
import { about } from './commands';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { Context as TelegrafContext } from 'telegraf';


require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const bot = new Telegraf(BOT_TOKEN);

// Definir estados
enum UserState {
  START,
  ASKED_PAYMENT,
  SELECTED_PAYMENT_METHOD,
  COLLECTED_INFO,
  PAYMENT_VERIFICATION
}

interface MyWizardSession extends Scenes.WizardSessionData {
  userState: UserState;
}



interface MyContext extends TelegrafContext {
  scene: Scenes.SceneContextScene<MyContext, MyWizardSession>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}


// Crear escena para manejar el flujo de conversación
const paymentWizard = new Scenes.WizardScene<MyContext>(
  'payment-wizard',
  async (ctx) => {
    await ctx.reply(
      'Hola! Bienvenido al bot de Erexit 3D. ¿Ya has realizado el pago para entrar a nuestra comunidad?',
      Markup.inlineKeyboard([
        Markup.button.callback('Sí', 'yes'),
        Markup.button.callback('No', 'no')
      ])
    );
    (ctx.wizard.state as MyWizardSession).userState = UserState.ASKED_PAYMENT;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Este paso se manejará con botones, por lo que no es necesario aquí
  },
  async (ctx) => {
    await ctx.reply(
      'Perfecto, elige el método de pago:',
      Markup.inlineKeyboard([
        Markup.button.callback('Paypal', 'paypal'),
        Markup.button.callback('MercadoPago', 'mercadopago'),
        Markup.button.callback('Patreon', 'patreon')
      ])
    );
    (ctx.wizard.state as MyWizardSession).userState = UserState.SELECTED_PAYMENT_METHOD;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Recoger datos del usuario
    await ctx.reply('Perfecto, ahora te voy a pedir tus datos. Ingresa tu nombre completo por favor');
    (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
    return ctx.wizard.next();
  },
  async (ctx: MyContext) => {
    // Solicitar correo electrónico
    await ctx.reply('Excelente, ahora tu dirección de mail');
    (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Enlace de pago y confirmación
    await ctx.reply('Ahora por favor realiza el pago a través del siguiente enlace>');
    // Aquí deberías insertar el enlace de pago
    await ctx.reply('Ingresa "ok" si ya realizaste el pago');
    (ctx.wizard.state as MyWizardSession).userState = UserState.PAYMENT_VERIFICATION;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Verificación final y enlace al grupo
    // Aquí deberías implementar la lógica de verificación del pago
    await ctx.reply('Excelente! ya estás suscrito. Ingresá al grupo de telegram con este link:-------');
    // Finalizar la escena
    return ctx.scene.leave();
  }
);

const rateLimit = (limit: number, interval: number): MiddlewareFn<Context> => {
  let lastCalled = Date.now();

  return async (ctx, next) => {
    if (Date.now() - lastCalled < interval) {
      await ctx.reply(`Por favor, espera ${interval / 1000} segundos antes de intentar de nuevo.`);
      return;
    }
    lastCalled = Date.now();
    await next();
  };
};

bot.use(rateLimit(1, 5000)); // Limita a 1 solicitud cada 5 segundos

bot.action('yes', async (ctx) => {
  const myCtx = ctx as unknown as MyContext; // Conversión doble
  await myCtx.reply('Has seleccionado Sí. Elige tu método de pago:');
  return myCtx.wizard.selectStep(2);
});

bot.action('no', async (ctx) => {
  const myCtx = ctx as unknown as MyContext; // Conversión doble
  await myCtx.reply('Has seleccionado No. Por favor, realiza el pago para continuar.');
  return myCtx.scene.leave();
});

bot.action('paypal', async (ctx) => {
  const myCtx = ctx as unknown as MyContext; // Conversión doble
  await myCtx.reply('Has seleccionado Paypal. Por favor, ingresa tus datos.');
  return myCtx.wizard.selectStep(3);
});

bot.action('mercadopago', async (ctx) => {
  const myCtx = ctx as unknown as MyContext; // Conversión doble
  await myCtx.reply('Has seleccionado MercadoPago. Por favor, ingresa tus datos.');
  return myCtx.wizard.selectStep(3);
});

bot.action('patreon', async (ctx) => {
  const myCtx = ctx as unknown as MyContext; // Conversión doble
  await myCtx.reply('Has seleccionado Patreon. Por favor, ingresa tus datos.');
  return myCtx.wizard.selectStep(3);
});

bot.use(session());
const stage = new Scenes.Stage<MyContext>([paymentWizard], { default: 'payment-wizard' });
bot.use(stage.middleware() as MiddlewareFn<Context>);

bot.command('about', about());
bot.command('start', async (ctx) => {
  try {
    (ctx as unknown as MyContext).scene.enter('payment-wizard');
  } catch (error) {
    console.error(error);
    await ctx.reply('Ocurrió un error, por favor intenta de nuevo.');
  }
});

if (process.env.ENVIRONMENT !== 'production') {
  development(bot);
} else {
  // Solo inicia el bot en producción
  //bot.launch();
}

export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  try {
    await production(req, res, bot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
};