import { app, h } from "hyperapp";
import "./products.css";

const Fragment = (props, children) => children;

const Product = ({ product, newProduct, input, create, isAdmin, fn }) => {
  let price;
  return (
    <>
      {product ? (
        <div class="card product">
          <div class="card-header">
            <strong>{product.name}</strong>
          </div>
          <div class="card-body">
            <img
              class="rounded float-left product-image"
              src={
                product.image.startsWith("http")
                  ? product.image
                  : "//robohash.org/" + product.image + "?set=set4&bgset=bg2"
              }
            ></img>

            <dl class="row">
              <dt class="col-sm-4">Name</dt>
              <dd class="col-sm-8">
                <h5>{product.name}</h5>
              </dd>

              <dt class="col-sm-4">Description</dt>
              <dd class="col-sm-8">
                <p>{product.description}</p>
              </dd>

              {isAdmin ? (
                <>
                  <dt class="col-sm-4">Proposed</dt>
                  <dd class="col-sm-8">
                    <p>$ {product.price}</p>
                  </dd>
                </>
              ) : (
                <>
                  <dt class="col-sm-4">Your proposed</dt>
                  <dd class="col-sm-8">
                    <p>$ {product.price}</p>
                  </dd>
                </>
              )}

              <dt class="col-sm-4">Actual</dt>
              <dd class="col-sm-8">
                <p>$ {product.finalPrice}</p>
              </dd>

              <dt class="col-sm-4">Status</dt>
              <dd class="col-sm-8">
                <p>{product.status}</p>
              </dd>
            </dl>
          </div>
          {isAdmin ? (
            <div class="card-footer">
              <div class="input-group">
                <div class="input-group-prepend">
                  {product.status === "CREATE" ? (
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      onclick={(e) => fn({ action: "start", data: "" })}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      disabled
                    >
                      Start
                    </button>
                  )}

                  {product.status === "PRICING" ? (
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      onclick={(e) => fn({ action: "stop", data: "" })}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      disabled
                    >
                      Stop
                    </button>
                  )}
                </div>

                {product.status === "STOP" ? (
                  <>
                    <input
                      type="number"
                      class="form-control"
                      placeholder="price"
                      oninput={(e) => (price = e.target.value)}
                    />
                    <div class="input-group-append">
                      <button
                        class="btn btn-outline-primary"
                        type="button"
                        onclick={(e) => fn({ action: "close", data: price })}
                      >
                        Set price and close
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      class="form-control"
                      placeholder="price"
                      disabled
                    />
                    <div class="input-group-append">
                      <button
                        class="btn btn-outline-primary"
                        type="button"
                        disabled
                      >
                        Set price and close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div class="card-footer">
              <div class="input-group">
                {product.status === "START" || product.status === "PRICING" ? (
                  <>
                    <input
                      type="number"
                      class="form-control"
                      placeholder="price"
                      oninput={(e) => (price = e.target.value)}
                    />
                    <div class="input-group-append">
                      <button
                        class="btn btn-primary"
                        type="button"
                        onclick={(e) => fn({ action: "pricing", data: price })}
                      >
                        Propose price
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      class="form-control"
                      placeholder="price"
                      disabled
                    />
                    <div class="input-group-append">
                      <button class="btn btn-primary" type="button" disabled>
                        Propose price
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <></>
      )}
      {isAdmin ? (
        <div class="card">
          <div class="card-header">
            <strong>Create new session</strong>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-sm-12">
                <div class="form-group">
                  <label for="name">Product name</label>
                  <input
                    type="text"
                    class="form-control"
                    id="name"
                    value={newProduct.name}
                    oninput={(e) => {
                      input({ field: "name", value: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-sm-12">
                <div class="form-group">
                  <label for="description">Product description</label>
                  <input
                    type="text"
                    class="form-control"
                    id="description"
                    value={newProduct.description}
                    oninput={(e) => {
                      input({ field: "description", value: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-sm-12">
                <div class="form-group">
                  <label for="image">Product image</label>
                  <input
                    type="text"
                    class="form-control"
                    id="image"
                    placeholder="http://"
                    value={newProduct.image}
                    oninput={(e) => {
                      input({ field: "image", value: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button type="submit" class="btn btn-primary" onclick={create}>
              Create
            </button>
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

const ProductRow = ({ product, index, select, currentIndex, isAdmin }) => (
  <tr
    onclick={(e) => select(index)}
    class={index === currentIndex ? "active" : ""}
  >
    <th scope="row">{product.no}</th>
    <td>{product.name}</td>
    <td>{product.description} </td>
    {isAdmin ? (
      <>
        <td>$ {product.price}</td>
        <td>$ {product.finalPrice}</td>
      </>
    ) : (
      <td>$ {product.price}</td>
    )}

    <td>{product.status}</td>
  </tr>
);
const Products =
  ({ match }) =>
  (
    { newProduct, sessions, currentProductIndex, isAdmin },
    { inputNewProduct, createProduct, selectProduct, sessionFn }
  ) => {
    return (
      <div class="d-flex w-100 h-100">
        <div class="bg-white border-right products-list">
          <table class="table table-hover table-striped">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Product</th>
                <th scope="col">Description</th>
                {isAdmin ? (
                  <>
                    <th scope="col">Proposed</th>
                    <th scope="col">Actual</th>
                  </>
                ) : (
                  <th scope="col">Your proposed</th>
                )}
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((p, i) => {
                p.no = i + 1;
                return (
                  <ProductRow
                    product={p}
                    index={i}
                    select={selectProduct}
                    currentIndex={currentProductIndex}
                    isAdmin={isAdmin}
                  ></ProductRow>
                );
                // return ProductRow(p, i, selectProduct, currentProductIndex);
              })}
            </tbody>
          </table>
        </div>
        <div class="pl-2 flex product-detail">
          <Product
            newProduct={newProduct}
            input={inputNewProduct}
            create={createProduct}
            product={sessions[currentProductIndex]}
            isAdmin={isAdmin}
            fn={sessionFn}
          ></Product>
        </div>
      </div>
    );
  };

export { Products };
