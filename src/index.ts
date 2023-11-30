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
    try {
      await ctx.reply(
        'Hola! Bienvenido al bot de Erexit 3D. ¿Ya has realizado el pago para entrar a nuestra comunidad?',
        Markup.inlineKeyboard([
          Markup.button.callback('Sí', 'yes'),
          Markup.button.callback('No', 'no')
        ])
      );
      (ctx.wizard.state as MyWizardSession).userState = UserState.ASKED_PAYMENT;
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error en la primera etapa del wizard:', error);
    }
  },
  async (ctx) => {
    // Este paso se manejará con botones, por lo que no es necesario aquí
  },
  async (ctx) => {
    try {
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
    } catch (error) {
      console.error('Error en la selección del método de pago:', error);
    }
  },
  async (ctx) => {
    try {
      await ctx.reply('Perfecto, ahora te voy a pedir tus datos. Ingresa tu nombre completo por favor');
      (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error al recoger datos del usuario:', error);
    }
  },
  async (ctx: MyContext) => {
    try {
      await ctx.reply('Excelente, ahora tu dirección de mail');
      (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error al solicitar el correo electrónico:', error);
    }
  },
  async (ctx) => {
    try {
      await ctx.reply('Ahora por favor realiza el pago a través del siguiente enlace>');
      // Aquí deberías insertar el enlace de pago
      await ctx.reply('Ingresa "ok" si ya realizaste el pago');
      (ctx.wizard.state as MyWizardSession).userState = UserState.PAYMENT_VERIFICATION;
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error en la etapa de enlace de pago y confirmación:', error);
    }
  },
  async (ctx) => {
    try {
      await ctx.reply('Excelente! ya estás suscrito. Ingresá al grupo de telegram con este link:-------');
      // Finalizar la escena
      return ctx.scene.leave();
    } catch (error) {
      console.error('Error en la verificación final y enlace al grupo:', error);
    }
  }
);

bot.action('yes', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply(
      'Has seleccionado Sí. Por favor, selecciona el método de pago que utilizaste:',
      Markup.inlineKeyboard([
        Markup.button.callback('Paypal', 'paid_paypal'),
        Markup.button.callback('MercadoPago', 'paid_mercadopago'),
        Markup.button.callback('Patreon', 'paid_patreon')
      ])
    );
    return myCtx.wizard.selectStep(myCtx.wizard.cursor);
  } catch (error) {
    console.error('Error al manejar acción "yes":', error);
  }
});

bot.action('no', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has seleccionado No. Por favor, realiza el pago para continuar.');
    return myCtx.scene.leave();
  } catch (error) {
    console.error('Error al manejar acción "no":', error);
  }
});

bot.action('paypal', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has seleccionado Paypal. Por favor, ingresa tus datos.');
    return myCtx.wizard.selectStep(3);
  } catch (error) {
    console.error('Error al manejar acción "paypal":', error);
  }
});

bot.action('mercadopago', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has seleccionado MercadoPago. Por favor, ingresa tus datos.');
    return myCtx.wizard.selectStep(3);
  } catch (error) {
    console.error('Error al manejar acción "mercadopago":', error);
  }
});

bot.action('patreon', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has seleccionado Patreon. Por favor, ingresa tus datos.');
    return myCtx.wizard.selectStep(3);
  } catch (error) {
    console.error('Error al manejar acción "patreon":', error);
  }
});

bot.action('paid_paypal', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has indicado que pagaste con Paypal. Procederemos a verificar tu pago.');
    // Aquí puedes añadir lógica para manejar la verificación de pago con Paypal
    return myCtx.wizard.next();
  } catch (error) {
    console.error('Error al manejar acción "paid_paypal":', error);
  }
});

bot.action('paid_mercadopago', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has indicado que pagaste con MercadoPago. Procederemos a verificar tu pago.');
    // Lógica similar para MercadoPago
    return myCtx.wizard.next();
  } catch (error) {
    console.error('Error al manejar acción "paid_mercadopago":', error);
  }
});

bot.action('paid_patreon', async (ctx) => {
  const myCtx = ctx as unknown as MyContext;
  try {
    await myCtx.reply('Has indicado que pagaste con Patreon. Procederemos a verificar tu pago.');
    // Lógica similar para Patreon
    return myCtx.wizard.next();
  } catch (error) {
    console.error('Error al manejar acción "paid_patreon":', error);
  }
});

bot.use(session());
const stage = new Scenes.Stage<MyContext>([paymentWizard], { default: 'payment-wizard' });
bot.use(stage.middleware() as MiddlewareFn<Context>);

bot.command('about', async (ctx) => {
  try {
    await about()(ctx);
  } catch (error) {
    console.error('Error al ejecutar el comando "about":', error);
    await ctx.reply('Ocurrió un error al procesar el comando "about".');
  }
});

bot.command('start', async (ctx) => {
  try {
    (ctx as unknown as MyContext).scene.enter('payment-wizard');
  } catch (error) {
    console.error('Error al iniciar el comando "start":', error);
    await ctx.reply('Ocurrió un error, por favor intenta de nuevo.');
  }
});

const rateLimit = (limit: number, interval: number): MiddlewareFn<Context> => {
  let lastCalled = Date.now();

  return async (ctx, next) => {
    try {
      if (Date.now() - lastCalled < interval) {
        await ctx.reply(`Por favor, espera ${interval / 1000} segundos antes de intentar de nuevo.`);
        return;
      }
      lastCalled = Date.now();
      await next();
    } catch (error) {
      console.error('Error en el middleware de rate limit:', error);
    }
  };
};

bot.use(rateLimit(1, 5000)); // Limita a 1 solicitud cada 5 segundos


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