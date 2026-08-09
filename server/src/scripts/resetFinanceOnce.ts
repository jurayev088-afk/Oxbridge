import { resetFinanceData } from '../resetFinanceData';

resetFinanceData()
  .then(() => {
    console.log('Moliya ma lumotlari tozalandi');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
