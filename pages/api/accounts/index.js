import { ok, unauthorized, methodNotAllowed, badRequest, hashPassword } from 'next-basics';
import { useAuth } from 'lib/middleware';
import { uuid } from 'lib/crypto';
import { createAccount, getAccount, getAccounts } from 'queries';

export default async (req, res) => {
  await useAuth(req, res);

  const { isAdmin } = req.auth;

  if (!isAdmin) {
    return unauthorized(res);
  }

  if (req.method === 'GET') {
    const accounts = await getAccounts();

    return ok(res, accounts);
  }

  if (req.method === 'POST') {
    const { username, password, account_uuid, websiteIds, isViewer } = req.body;

    const account = await getAccount({ username });

    if (account) {
      return badRequest(res, 'Account already exists');
    }

    const created = await createAccount({
      username,
      password: hashPassword(password),
      accountUuid: account_uuid || uuid(),
      isViewer,
      viewwebsites: {
        create: websiteIds
          .map(id => parseInt(id))
          .map(id => ({
            website: { connect: { id } },
          })),
      },
    });

    return ok(res, created);
  }

  return methodNotAllowed(res);
};
