import { Router } from 'express';
import { HttpError } from '../../common/errors';
import { prisma } from '../../database/prisma';
import { createAndStoreInvoicePdf, invoicePdfDownloadName } from '../../integrations/storage/local-invoice-pdf.service';
import { authenticate } from '../auth/authenticate';

export const invoiceDocumentsRouter = Router();

invoiceDocumentsRouter.get('/invoices/:invoiceId/pdf', authenticate, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.invoiceId },
      include: { customer: true, lines: true, payments: true },
    });
    if (!invoice) throw new HttpError(404, 'Invoice not found.');
    if (req.auth?.role === 'CUSTOMER' && req.auth.customerId !== invoice.customerId) {
      throw new HttpError(404, 'Invoice not found.');
    }

    const pdf = await createAndStoreInvoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoicePdfDownloadName(invoice.number)}"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});
