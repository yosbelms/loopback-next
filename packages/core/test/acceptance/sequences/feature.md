# Feature: Sequences

- In order to control what happens during the request/response lifecycle of my application
- As an app developer
- I want to define a series of actions
- So that I can customize the invocation order of registered components

## Scenario: Basic usage (extending the default sequence)

- Given an `Application`
- And a custom `TodoSequence`
- When a request to the appplication is received
- Then the application should use the cutomized `TodoSequence`

```ts
import {Application, Sequence, injectInvoke, injectSend} from '@loopback/core';
import {injectUser, injectAuthenticate} from '@loopback/authentication';
import {Authorization, injectAuthorize} from '@loopback/authorization';
import {Rejection, injectReject} from '@loopback/rejection';

class TodoSequence extends Sequence {
  constructor(
    public @injectAuthenticate() authenticate,
    public @injectAuthorize() authorize,
    public @injectInvoke() invoke,
    public @injectSend() send,
    public @injectReject() reject
  ) {}

  async run() {
    await this.authenticate();
    await this.authorize();
    this.send(await this.invoke());
  }
}

const app = new Application({
  components: [Todo, Authentication, Authorization, Rejection],
  sequence: [TodoSequence]
});

await client.get('/all/todos'); // should run custom sequence above
```
